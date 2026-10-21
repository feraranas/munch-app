# Munch App verification map

Maintained source for verifying Munch App's user-facing behavior. Read this index, then use the matching feature file as the recipe. Harness: `scripts/munchctl` (see `../SKILL.md`).

## Baseline preconditions

- `RUN_ID=<unique> scripts/munchctl launch` printed `READY`; `scripts/munchctl doctor` exits 0.
- Fresh SQLite DB at `/tmp/munch-verify-$RUN_ID/munch.db` with the 12 seeded menu items and staff user `verify_admin` / `verify-pass-123`.
- No QR sessions, orders, or payments exist at launch.
- Frontend `http://localhost:13000`, API `http://127.0.0.1:18080` unless overridden.

## Driving conventions

- Prefer roles, accessible names, placeholders, and visible Spanish copy; the app has no data-testids.
- Use `login()` from the journey runner for staff pages; do not inject tokens.
- Name created data with `$RUN_ID` so runs never collide; the DB is discarded at cleanup.

## Proof and skip reporting

- Screenshot + ARIA snapshot before, during, and after the action; plus a second view (other page or API).
- Record feature ID and entry point in `journey.log`.
- Report an unreachable path with the attempted command and the unmet precondition; never report it verified via another path.

## Features

- [Staff login](./staff-login.md) — login form, protected-route redirect, bad credentials.
- [Admin menu management](./admin-menu.md) — create, edit, archive/activate items; diner menu reflects it. **Proven** (`journeys/admin-menu-create.mjs`, create path only).
- [QR table generator](./qr-generator.md) — create permanent table QR, dashboard lists session.
- [Diner menu](./diner-menu.md) — public read-only menu with toppings.
- [Diner check view](./diner-check.md) — `/check/:qrId` table bill, claims, mock payment.
