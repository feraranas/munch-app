# QR table generator

Staff create a permanent QR code for a table; the QR encodes a diner check URL and the session shows up on the admin dashboard.

## Sub-features

- `qr-create` creates a session with optional table label and shows QR-ID, check URL, and QR image.
- `qr-dashboard` the new session appears on `/admin` (SessionGrid) instead of `No hay sesiones QR`.

## How to get to it (user POV)

- Log in, open `/admin/qr`, or follow link `Generador de QR` from the empty dashboard.

## Driving it with munchctl browser

Preconditions:

- Baseline (no sessions); logged in.

- **Empty dashboard.** `page.goto(WEB + '/admin')`. Heading `No hay sesiones QR` visible.
- **Create.** On `/admin/qr` fill placeholder `Ej: Mesa 1, Mesa A, Terraza 5` with `Mesa $RUN_ID`, click button `🖼️ Crear QR Permanente`. Heading `✅ QR Permanente Creado!`, text `Mesa: Mesa $RUN_ID`, `img[alt="QR Code"]` visible; `URL del Cliente` starts with `http://localhost:$FRONTEND_PORT/check/`.
- **Side effect.** `GET /api/admin/sessions` with the bearer token lists the QR-ID.
- **Dashboard.** `/admin` shows the session tile.
- **Proof.** Screenshots of the created QR and the dashboard; saved sessions JSON.

## Gotchas

- Check URL is built from backend `FRONTEND_URL`; launch sets it to this run's frontend.
- The QR image URL may point to an external QR rendering service — the image may not load offline; assert the check URL text instead.
- Not yet driven end to end — journey not written.
