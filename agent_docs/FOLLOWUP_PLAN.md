# Munch App — Follow-up plan (agent handoff)

**Tag:** `followup/2026-09-20`  
**Repo:** `feraranas/munch-app`  
**Default branch:** `main`  
**Written:** 2026-09-20 (CT)

> Coding agents: start here. Read this file (or check out tag `followup/2026-09-20`), then pick the next `/goal` below. Prefer goal-and-proof prompts. Do not invent product scope beyond this plan unless Ferdinand asks.

---

## Done (outer loop landed on main)

| PR | Goal | Notes |
|----|------|--------|
| [#39](https://github.com/feraranas/munch-app/pull/39) | README port/docs drift | Frontend `:3000`, Grafana `:3001` |
| [#40](https://github.com/feraranas/munch-app/pull/40) | Persist WS item claims | `item_claims` + ClaimStore; Codex P1/P2 addressed (payment clear, mem/DB serialize, validate, TTL/reclaim, eviction unload) |
| [#41](https://github.com/feraranas/munch-app/pull/41) | Menu as data | `menu_items` table + seed; handlers list/price from store |

**Constraints from prior loops**
- Cloud Agents may be unavailable (plan); GitHub API (branch → push → PR) is an acceptable path for scoped work.
- Do not clone onto agent machines when remote GitHub reads/writes suffice.
- TanStack Start migration is **explicitly later** — do not start it from this plan.

---

## Next goals (priority order)

### 1. Menu write path (recommended next `/goal`)

**Why:** Catalog is in DB, but ops still need SQL to change prices/names. Without writes, “no deploy for menu changes” is incomplete.

**/goal**  
Add authenticated staff/admin API (and a small UI if natural) to create, update, and archive/deactivate `menu_items`.

**Proof**
1. JWT-protected endpoints can create/update/archive items (soft-delete or `active` flag preferred over hard delete if orders reference ids).
2. `GET /api/menu/items` reflects changes without rebuild; POS/order pricing uses updated store prices.
3. Unauthenticated callers cannot mutate the catalog.
4. Automated tests cover create → list → update price → price helper reflects store.
5. `CLAUDE.md` documents the write path.
6. PR against `main`; no Openpay/Apple Pay/TanStack scope creep.

**Hints:** Reuse existing staff JWT auth tiers in `main.go` / `auth.go`. Keep JSON shape compatible with frontend `MenuItem` (`id`, `name`, `price`, `toppings?`). Seed remains bootstrap-only.

---

### 2. Apple Pay beside Openpay (design → then implement)

**Context today**
- Frontend: Openpay.js card tokenize (`useOpenpay.ts`) → `POST /api/payments/charge` with `{order_id, token_id, device_session_id}`.
- Backend: amount from order DB; `openpay.go` `CreateCharge` with `method: "card"`, `source_id` = Openpay token.
- Openpay MX public docs emphasize card/store/SPEI tokens; **no clear native Apple Pay / PKPaymentToken → `source_id` path** documented.

**Plan**
1. **Confirm with Openpay support** whether MX merchants can accept Apple Pay wallet tokens (or a partner bridge). Do not stuff Apple’s token into `source_id` blindly.
2. If yes (or alternate rail chosen): introduce a **payment method adapter** (`card_token` \| `apple_pay`) so `/charge` stays order-id based and amount still comes from DB; keep card path unchanged.
3. Product gates: Apple Merchant ID, domain verification, HTTPS, MX country/network enablement, Safari/Payment Request UI, fallback to current card form.
4. Optional first PR: short design doc only (`agent_docs/APPLE_PAY.md`) + support-email draft — implement after confirmation.

**/goal (implementation, after confirmation)**  
Diner can pay their claimed share via Apple Pay on iPhone Safari; `Payment` row stored; peers see `payment_confirmed`; existing Openpay card flow unchanged.

**Proof (implementation)**
1. Adapter selects rail by method; card path regression-tested.
2. Amount never client-trusted.
3. Manual or automated smoke: Apple Pay success + decline paths documented in PR.

---

### 3. Branch hygiene

~23 long-lived topic branches with **no open PRs** remain. GitHub MCP has no delete-ref; box `gh` may be unauthenticated.

**Keep:** `main`, recent work branches still useful (`feat/menu-as-data`, `persist-ws-item-claims`, `fix/readme-port-docs-drift`, `docs/followup-plan` if open).

**Delete candidates (verify no open PR first):**  
`ci-cd`, `containerized`, `datadog`, `design-system`, `farana/ux-changes`, `feat-add-jwt-auth-e41b2`, `fix/d74-credential-token-leak`, `fix-nullish-qr-sessions-backend-defensive-frontend`, `fix-websocket-frame`, `grafana-logs`, `item-claiming`, `iteration1`, `iteration2`, `iteration2-websocket-debug`, `iteration3-minimum`, `modal-sheet-improvement`, `payments-processing`, `postgres-migration`, `tanstack-query`, `toppings`, `ux-changes`, `websocket-minimum-structure`, `websocket-user-ux`.

```bash
# After gh auth login
gh api -X DELETE "repos/feraranas/munch-app/git/refs/heads/<branch>"
```

---

### 4. Explicitly later

- **TanStack Start / Router loaders** — aspirational in `frontend/AGENT.md`; do not start until product is stable and Ferdinand asks.
- **Ops:** rotate Openpay/JWT secrets that were in git history (post-`munch-app-d74`) — ops checklist, not a feature PR.

---

## How to continue (prompt stub for another agent)

```text
Repo: https://github.com/feraranas/munch-app
Read: agent_docs/FOLLOWUP_PLAN.md (or git tag followup/2026-09-20)

/goal
<pick §1 Menu write path unless Ferdinand says otherwise>

Follow the proof checklist in that section. Open a PR against main.
Prefer GitHub remote edits if Cloud Agents are unavailable.
Do not start TanStack or Apple Pay implementation without explicit ask / Openpay confirmation.
```

---

## Stack quick ref

- Backend: Go 1.23, Gin, GORM, WS hub, Openpay charges, Postgres (+ sqlite).
- Frontend: React 18 CRA + TS + Tailwind.
- Issue tracker: Beads (`.beads/`), not GitHub Issues.
- Ports: backend `8080`, frontend `3000`, Grafana `3001`.
