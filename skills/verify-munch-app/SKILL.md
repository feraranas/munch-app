---
name: verify-munch-app
description: "Drive the Munch App (QR restaurant bill-splitting: Go/Gin backend + React CRA frontend) the way staff and diners do, in an isolated SQLite-backed instance, and capture screenshot/ARIA/API evidence. Use when you need to prove a UI or API change in munch-app actually works (admin login, menu CRUD, QR generation, diner check/menu views)."
---

# Verify Munch App

Primary surface: the **web UI** (React, mobile-first, Spanish copy) at `/login`, `/admin`, `/admin/menu`, `/admin/qr`, `/admin/pos`, `/admin/table/:tableId/pos`, `/menu`, `/check/:orderId`.
Secondary surface: the **HTTP API** (`/health`, `/api/auth/login`, `/api/menu/items`, `/api/qr/create`, `/api/qr/:qrId`, `/api/orders/*`, `/ws/session`).

Everything goes through one helper, `scripts/munchctl` (paths below are relative to this skill dir, `skills/verify-munch-app/`; `.cursor/skills/verify-munch-app` and `.claude/skills/verify-munch-app` are symlinks to it, and `munchctl` resolves its own real location so any of the three paths works). Always pick a unique `RUN_ID`.

## Launch

```bash
cd skills/verify-munch-app        # or .cursor/skills/... / .claude/skills/... (symlinks)
export RUN_ID=$(date +%s)            # unique per run
scripts/munchctl launch              # prints READY + the env block on success
```

What it does (no docker needed; the repo's `docker-compose.yml` pulls Postgres, Datadog, Loki, Grafana and binds fixed ports 3000/8080/5432, so it is NOT used for verification):
- `npm install` in `frontend/` if `node_modules` is missing; installs `playwright-core` into `/workspace/munch-verify-tools` (outside the repo) if missing. Uses system Chrome `/usr/bin/google-chrome` (override with `CHROME=`).
- `go build` the backend into `/tmp/munch-verify-$RUN_ID/munch-backend`, starts it with `DATABASE_TYPE=sqlite DATABASE_URL=/tmp/munch-verify-$RUN_ID/munch.db API_PORT=$BACKEND_PORT FRONTEND_URL=http://localhost:$FRONTEND_PORT`, a per-run `JWT_SECRET`, and **no Stripe keys** (backend logs `payments will use the local mock path`).
- GORM AutoMigrate creates tables and `seedMenuItems` seeds 12 dishes (e.g. `Tacos al Pastor (3)` $12.99) on an empty DB. Ready = `/health` returns `{"status":"ok"}` AND `/api/menu/items` contains `tacos_pastor`.
- Seeds staff user `verify_admin` / `verify-pass-123` (role `admin`) directly into the `users` table (the app has no in-app signup; the repo's `scripts/create-admin-user.sh` targets Postgres only).
- Starts CRA (`npx react-scripts start`) with `PORT=$FRONTEND_PORT BROWSER=none REACT_APP_API_URL=http://127.0.0.1:$BACKEND_PORT`. Ready = log line `webpack compiled` / `Compiled successfully` and `/` serves `id="root"`. First compile ≈ 10–60 s.

Defaults: `BACKEND_PORT=18080`, `FRONTEND_PORT=13000`. Launch refuses if either port is already bound (it never drives someone else's instance). For a second parallel run, set different `RUN_ID`, `BACKEND_PORT`, `FRONTEND_PORT`. The frontend origin must be exactly `http://localhost:$FRONTEND_PORT` because backend CORS allows only `FRONTEND_URL`.

Teardown: `scripts/munchctl cleanup` (see Cleanup).

## Doctor

```bash
RUN_ID=$RUN_ID scripts/munchctl doctor   # read-only; exit 0 = worth driving
```
Checks: both process groups recorded in `/tmp/munch-verify-$RUN_ID/*.pgid` are alive; `/health` ok; menu non-empty; `verify_admin` can log in via `POST /api/auth/login`; frontend serves; backend log shows it connected to *this run's* DB file; prints git short SHA. Any `FAIL` → read `/tmp/munch-verify-$RUN_ID/{backend,frontend}.log`, then cleanup and relaunch.

## Drive

Browser journeys are ES modules run in headless Chrome via Playwright:

```bash
RUN_ID=$RUN_ID scripts/munchctl browser journeys/admin-menu-create.mjs   # exit 0 + "JOURNEY PASS"
```

A journey is `export default async ({ page, shot, log, login, env, out }) => { ... }`:
- `login()` — goes to `/login`, fills `#username` / `#password`, clicks button `Iniciar Sesión`, waits to leave `/login` (lands on `/admin`). Token lives in `localStorage.auth_token`.
- `shot(label)` — full-page PNG + ARIA snapshot (`.aria.txt`) into the evidence dir, numbered.
- `env.WEB`, `env.API`, `env.RUN_ID`, `env.EVIDENCE_DIR`, `env.ADMIN_USER`, `env.ADMIN_PASS`.
- Viewport is 430×900 (mobile; the app is designed for phones).

Stable handles in this repo (no data-testids exist; use roles/placeholders/text):
- Login: `#username`, `#password`, button `Iniciar Sesión`.
- Admin menu `/admin/menu`: heading `Agregar item`, placeholders `Nombre`, `Precio`, button `Crear`; per row buttons `Editar` / `Archivar` (`Activar` when archived), edit mode `Guardar` / `Cancelar`; archived rows show `· Archivado`.
- Diner menu `/menu`: each item is an `h3` heading with its name; prices `$12.99` style.
- QR generator `/admin/qr`: placeholder `Ej: Mesa 1, Mesa A, Terraza 5`, button `🖼️ Crear QR Permanente`, result heading `✅ QR Permanente Creado!`, `img[alt="QR Code"]`.
- POS `/admin/pos`: placeholder `Ingresa el QR-ID de la mesa (ej: a1b2c3d4-...)`, heading `📋 Menú Disponible`, `🛒 Resumen del Pedido`.
- Dashboard `/admin` (SessionGrid): empty state heading `No hay sesiones QR` with link `Generador de QR`.

API driving (curl) for setup or side-effect checks:
```bash
. /tmp/munch-verify-$RUN_ID/env
TOKEN=$(curl -s -X POST $API/api/auth/login -H 'Content-Type: application/json' -d "{\"username\":\"$ADMIN_USER\",\"password\":\"$ADMIN_PASS\"}" | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
curl -s $API/api/menu/items                      # {"items":[...]} active items, public
curl -s -H "Authorization: Bearer $TOKEN" $API/api/admin/sessions
```

## Evidence

Location: `/workspace/munch-verify-evidence/$RUN_ID/<journey-name>/` (outside the repo and outside the run dir; cleanup never touches it). Each journey writes numbered `NN-label.png` + `NN-label.aria.txt`, `journey.log` (steps, trimmed browser console errors, PASS/FAIL), and any API bodies it saves. On failure a `NN-failure.png` is taken.

Proof standards:
- Drive the real user path (login form, buttons) — never inject `localStorage` tokens or call internal setters to skip UI for the step being proved.
- Capture before, the action (filled form), and after; then confirm from a **second view** (another page and/or the public API) — e.g. a created menu item must appear in `/api/menu/items` and on `/menu`.
- Verify side effects: rows in `/tmp/munch-verify-$RUN_ID/munch.db` (python `sqlite3`) or API responses, not just UI.
- Payments: with no Stripe keys the backend uses its mock path. That is a dev mode, not production Stripe; never claim Stripe charges verified. Never set real Stripe keys for verification.
- Known benign console noise: React `Invalid DOM property stroke-width` warnings from `BillIcon`.

## Cleanup

```bash
RUN_ID=$RUN_ID scripts/munchctl cleanup
```
Kills only the two process groups whose PGIDs launch recorded (`kill -TERM -- -<pgid>`, then `-KILL`), then deletes `/tmp/munch-verify-$RUN_ID` (DB, binary, logs). Never kill by name (`pkill node`/`go`) — the user may run their own dev servers on 3000/8080. Evidence in `/workspace/munch-verify-evidence/$RUN_ID` is kept and listed. If a launch fails half-way, still run cleanup. Afterwards `ss -ltn | grep -E ':(18080|13000)\b'` should print nothing.

## Helpers

- `scripts/munchctl launch|doctor|browser <journey.mjs>|env|cleanup` — env knobs: `RUN_ID`, `BACKEND_PORT`, `FRONTEND_PORT`, `ADMIN_USER`, `ADMIN_PASS`, `EVIDENCE_DIR`, `MUNCH_VERIFY_TOOLS`, `CHROME`.
- `scripts/browser.mjs <journey.mjs>` — the Playwright runner (`munchctl browser` sets `NODE_PATH` and env for it; don't call directly).
- `journeys/admin-menu-create.mjs` — proven journey for `features/admin-menu.md`. Copy it as a template for new journeys.
- Feature map: `features/README.md`.
