# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

QR code-based restaurant bill splitting. Diners scan a table QR, join a shared WebSocket session, claim individual items off the check, and pay their share via Openpay. Staff use authenticated admin/POS views to create sessions and orders.

Two deployables: `backend/` (Go 1.23, Gin + GORM) and `frontend/` (React 18 CRA + TypeScript + Tailwind).

## Commands

Environment files are gitignored; run `./setup-env.sh` once to generate `frontend/.env` and `backend/.env`. `./test-setup.sh` checks repo health.

```bash
# Full stack (postgres, datadog-agent, loki/promtail/grafana included)
make dev-postgres        # docker-compose up --build
make dev-sqlite          # DATABASE_TYPE=sqlite variant
make logs                # docker-compose logs -f
make clean               # down -v + prune

# Backend (cd backend)
make run                 # go run .        → :8080
make dev                 # air auto-reload (make install-air first)
make test                # go test -v ./...
go test -v -run TestName ./...   # single test
make fmt

# Frontend (cd frontend)
npm start                # CRA dev server → :3000
npm test                 # jest watch mode
npm test -- -t "name"    # single test
npm run build
```

Ports: backend 8080, frontend 3000, postgres 5432, grafana 3001. CORS/WebSocket origin checks are hardcoded against `http://localhost:3000`.

## Architecture

**Backend is a flat `package main`** — no internal packages except `config/`. Everything hangs off the `App` struct (`main.go`), which carries `DB`, `Router`, `Hub`, `Config`, and a zerolog `Logger`. Handlers are methods on `*App`, so adding an endpoint means a method in `handlers.go` plus a route in `initRouter`.

**Route auth tiers** (`main.go:initRouter`) matter and are easy to get wrong. `/api/auth/*` is public. A *public* `/api` group serves clients who have no account: reading a QR session, reading an order, listing the **active** menu, and — importantly — `POST /api/payments/charge`. A separate *protected* `/api` group behind `authMiddleware` covers session creation, order creation/update, POS, admin session listing, and catalog writes (`POST/PUT/DELETE /api/menu/items`, `GET /api/admin/menu/items`). Diners are never authenticated; identity is a device fingerprint, not a login.

**Diner identity is derived, not stored.** The frontend generates a fingerprint (`utils/deviceFingerprint.ts`) and sends it in the WebSocket `join_session` message; `client.go:generateDeterministicUserID` hashes fingerprint+session into a stable user ID so a refresh rejoins as the same person. Note: the fingerprint includes a `sessionStorage` ID, so closing the tab/browser yields a *new* user ID — abandoned claims are recovered via TTL expiry and reclaim-when-owner-offline (see below).

**WebSocket layer** follows the gorilla/websocket hub pattern: `hub.go` owns `clients` plus a `sessions map[qrSession]map[*Client]bool` and is the only goroutine touching those maps — mutate them exclusively through the `register`/`unregister`/`broadcast` channels. `client.go` runs `readPump`/`writePump` per connection and handles message types `ping`, `item_selection`, and `payment_confirmed`; item claims and group payment totals are broadcast per-session, and `broadcastUserListToSession` fires on every join/leave. On join the hub sends `join_ack` (assigned `user_id`) then replays durable claims as `item_selection` messages. Item claims are persisted in `item_claims` (GORM `ItemClaim` + `ClaimStore` in `claims.go`): written on each claim change, cached in memory for live broadcast, and reloaded from the DB after a backend restart — scoped per QR session so sessions never leak into each other. Claim writes validate that the QR session exists and `item_id` is a `menuId` on the session's current order. `SetClaim`/`ClearClaim` hold the store lock through DB persistence before updating memory so concurrent claimers cannot diverge mem vs DB. Claims older than `ClaimTTL` (45m) are deleted on `LoadSession`. A connected diner may take over an item whose claimer is not in the live session clients map; the UI treats disconnected claimers as reclaimable. Successful payment sends deselections so durable claims for paid items are cleared. Evicting a slow client via full send buffer uses `removeClientFromSession`, which unloads the claims cache when the session empties (same as unregister).

**Menu items live in `menu_items`** (GORM `MenuItem` in `models.go`, helpers/seed in `menu.go`, SQL migrations `004_add_menu_items.sql` + `005_menu_items_active.sql`). Startup `seedMenuItems` loads the default catalog when the table is empty (bootstrap only — later ops edits are not overwritten). Public `GET /api/menu/items` returns **active** rows in `{id,name,price,toppings?}` shape. Staff JWT can create/update/archive via `POST /api/menu/items`, `PUT /api/menu/items/:id`, `DELETE /api/menu/items/:id` (archive sets `active=false`; no hard delete because orders/claims keep item ids). `GET /api/admin/menu/items` lists all rows including archived. POS/`updateOrder` price from the store and skip archived ids. Staff UI: `/admin/menu`. `Order.Items` is a JSON string column, not a relation.

**Persistence**: GORM `AutoMigrate` on `StaffUser`, `QRSession`, `Order`, `Payment`, `ItemClaim`, `MenuItem` runs at startup, *and* `backend/migrations/*.sql` are mounted into the postgres container's init dir. Schema changes generally need both. `StaffUser` maps to table `users`; `ItemClaim` maps to `item_claims` (unique on `qr_session` + `item_id`); `MenuItem` maps to `menu_items` (`active` defaults true). Postgres is the default (`config.go`); sqlite is supported via `DATABASE_TYPE=sqlite`.

**Payments**: the frontend tokenizes the card with Openpay's JS SDK (`hooks/useOpenpay.ts`, `types/openpay.d.ts`) so raw card data never reaches the backend, then posts `{order_id, token_id, device_session_id}` — an order ID, never a client-supplied amount. `processPaymentCharge` looks the amount up from the order, writes a `Payment` row, and calls `openpay.go`. Credentials come only from `OPENPAY_MERCHANT_ID`/`OPENPAY_PRIVATE_KEY`; the service logs a warning and stays up when unset.

**Frontend data flow**: server state goes through TanStack Query with keys centralized in `hooks/useQueries.ts` (`queryKeys`); realtime state goes through `hooks/useWebSocket.ts`. All URLs are built from `config/environment.ts` — add endpoints to its `api` object rather than hardcoding. `services/api.ts` attaches the JWT from `localStorage.auth_token`. Routing is `createBrowserRouter` in `App.tsx`, with staff routes wrapped in `ProtectedRoute` and auth state in `contexts/AuthContext.tsx`.

`frontend/AGENT.md` and `AGENT-2.md` argue for TanStack Start/Router loaders over `useEffect` fetching. That is aspirational — this is CRA with `createBrowserRouter`, so loaders don't apply. The transferable rule: don't fetch or derive state in `useEffect`; use TanStack Query for server data and reserve effects for genuine external subscriptions (the WebSocket hook is a legitimate one).

## Observability

Datadog APM (`tracer.Start` + gin middleware) and Sentry on the frontend are both wired up. `.cursor/rules/{datadogrules,sentryrules}.mdc` hold the house patterns: `Sentry.captureException(error)` in catch blocks, and named `Sentry.startSpan({op, name})` spans around meaningful actions (button clicks, API calls) with context attached via `span.setAttribute`.


<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:6cd5cc61 -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/SYNC_CONCEPTS.md for details and anti-patterns.

## Agent Context Profiles

The managed Beads block is task-tracking guidance, not permission to override repository, user, or orchestrator instructions.

- **Conservative (default)**: Use `bd` for task tracking. Do not run git commits, git pushes, or Dolt remote sync unless explicitly asked. At handoff, report changed files, validation, and suggested next commands.
- **Minimal**: Keep tool instruction files as pointers to `bd prime`; use the same conservative git policy unless active instructions say otherwise.
- **Team-maintainer**: Only when the repository explicitly opts in, agents may close beads, run quality gates, commit, and push as part of session close. A current "do not commit" or "do not push" instruction still wins.

## Session Completion

This protocol applies when ending a Beads implementation workflow. It is subordinate to explicit user, repository, and orchestrator instructions.

1. **File issues for remaining work** - Create beads for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **Handle git/sync by active profile**:
   ```bash
   # Conservative/minimal/default: report status and proposed commands; wait for approval.
   git status

   # Team-maintainer opt-in only, unless current instructions forbid it:
   git pull --rebase
   git push
   git status
   ```
5. **Hand off** - Summarize changes, validation, issue status, and any blocked sync/commit/push step

**Critical rules:**
- Explicit user or orchestrator instructions override this Beads block.
- Do not commit or push without clear authority from the active profile or the current user request.
- If a required sync or push is blocked, stop and report the exact command and error.
<!-- END BEADS INTEGRATION -->
