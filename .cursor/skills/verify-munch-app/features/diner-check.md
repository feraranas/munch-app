# Diner check view

A diner who scans a table QR opens `/check/<qrId>` to see the table's order, claim items, and pay their share.

## Sub-features

- `check-waiting` a QR with no order shows `⏳ Esperando Orden`.
- `check-order` after staff place an order (POS), items and totals appear live (WebSocket `/ws/session`).
- `check-claim` diner claims items; claims persist (`item_claims`).
- `check-pay` payment via `POST /api/payments/intents` — mock path when no Stripe keys.
- `check-error` unknown QR shows `Error, llama al mesero`.

## How to get to it (user POV)

- Scan the QR from `/admin/qr` or open its `URL del Cliente`.

## Driving it with munchctl browser

Preconditions:

- A QR session exists (run the `qr-create` steps first, or `POST /api/qr/create` with the bearer token) and, for `check-order`, staff placed an order via `/admin/pos` (placeholder `Ingresa el QR-ID de la mesa (ej: a1b2c3d4-...)`).

- **Waiting.** `page.goto(<checkUrl>)`. Heading `⏳ Esperando Orden`.
- **Error.** `page.goto(WEB + '/check/does-not-exist')`. Heading `Error, llama al mesero`.
- **Order.** In a second page, place an order on `/admin/pos` for that QR-ID; the check page updates with the items.
- **Pay (mock).** Use the payment button/form (`💳 Pago con Tarjeta`); assert backend log shows the mock path and a `payments` row exists in the DB.
- **Proof.** Screenshots of waiting, populated, and paid states; DB rows.

## Gotchas

- Without Stripe keys only the mock payment path runs; this does not verify real Stripe Payment Element / webhooks. Stripe minimum is $10 MXN.
- Claims are keyed by a device fingerprint; use separate browser contexts for multiple diners.
- Not yet driven end to end — exact POS/claim/pay button names need confirming when the journey is written.
