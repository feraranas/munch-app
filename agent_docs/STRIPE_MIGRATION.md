# Migrate payments: Openpay → Stripe (Mexico)

**Status:** implementation on `feat/stripe-payment-element` — Openpay is **parked**. Do not add Openpay features (including Apple Pay on Openpay).  
**Decision (2026-09-23):** Ferdinand — prefer Stripe as the simplest MX card rail for Munch’s embedded split-check.  
**Repo:** `feraranas/munch-app`  
**Related:** [`FOLLOWUP_PLAN.md`](FOLLOWUP_PLAN.md), [`APPLE_PAY.md`](APPLE_PAY.md) (superseded for rail choice), [`SECRET_ROTATION.md`](SECRET_ROTATION.md)  
**Agent tooling:** Stripe Cursor plugin (skills + MCP). Prefer Stripe skills/`stripe-docs` / MCP over ad-hoc docs scraping when implementing.

---

## Why park Openpay

- High maintainership: custom Openpay.js tokenizer, `device_session_id`, merchant/private keys, BBVA-adjacent ops.
- No clear documented Apple Pay → `source_id` path on Openpay MX.
- Stripe gives Payment Element + PaymentIntents (or Checkout Sessions with Elements), Go + React SDKs, test mode, and Apple Pay enablement in Dashboard later — less custom glue.

**Fees (ballpark, verify in Dashboard):** ~3.6% + $3 MXN domestic cards. Not the cheapest vs Conekta; chosen for **ops/DX simplicity**, not fee minimization.

---

## Invariants that must survive the migration

These already exist on `main` (esp. PR #44). Keep them:

1. Amount for a charge comes **only** from the order DB for the requested `item_ids` (`amountForMenuIDs` / equivalent) — never from the client.
2. Reject charges that overlap already-completed `Payment.ItemIDs` (409).
3. Mark order `paid` only when every line is covered; otherwise partial (`Pago parcial` / `tablePayState`).
4. Public `POST /api/payments/charge` (or its Stripe successor) stays diner-accessible without staff JWT; diners are fingerprint identity, not login.
5. Dev without live keys: a safe mock/test path (today: Openpay unset → `tok_mock_local`; after: Stripe test keys or explicit mock flag).

---

## Target architecture

```
PaymentForm (React)
  └─ Stripe Payment Element (@stripe/react-stripe-js)
         │  confirm on client with client_secret
         ▼
Backend
  1) POST /api/payments/intents  { order_id, item_ids }
       → validate items, compute amount (centavos MXN)
       → insert Payment pending (+ item_ids)
       → stripe.PaymentIntents.Create(amount, currency=mxn, metadata)
       → return { client_secret, payment_id }
  2) Webhook POST /api/payments/stripe/webhook
       → verify signature
       → on payment_intent.succeeded → complete Payment, update order status,
         clear claims for paid lines, notify hub
  3) Optional: GET /api/payments/:id for poll backup if webhook delayed
```

**Remove / stop using**

- `frontend/src/hooks/useOpenpay.ts` and Openpay.js script tags
- `backend/openpay.go` as the live charge path (delete or leave dead until cleanup PR)
- Env: `OPENPAY_*`, `REACT_APP_OPENPAY_*` (replace with Stripe)

**Add**

- Env: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
- Frontend: `REACT_APP_STRIPE_PUBLISHABLE_KEY`
- Go: official `github.com/stripe/stripe-go` (pin API version Stripe recommends in skills/best-practices)
- Docs: `CLAUDE.md` payment section rewritten for Stripe

**Apple Pay:** Out of scope for the first Stripe PR. After card Payment Element works, enable Apple Pay in Stripe Dashboard + domain verification — usually no Openpay-style custom token plumbing. Update/supersede `APPLE_PAY.md` when that PR starts.

---

## API sketch (implementation)

### Create intent

`POST /api/payments/intents`

```json
{ "order_id": "...", "item_ids": ["line-1", "line-2"] }
```

Response `200`:

```json
{ "client_secret": "pi_..._secret_...", "payment_id": "...", "amount": 1299, "currency": "mxn" }
```

(`amount` in **centavos** for Stripe; store pesos or centavos consistently in `Payment` — pick one and document.)

### Webhook

Handle at least: `payment_intent.succeeded`, `payment_intent.payment_failed`. Idempotent on Stripe event id / Payment row.

### Deprecate

`POST /api/payments/charge` with Openpay `token_id` — remove once frontend is cut over (same PR or immediate follow-up; do not leave two live card rails).

---

## Ops prerequisites (Ferdinand)

1. Create / use a **Stripe Mexico** account; complete KYC.
2. Dashboard → Developers: test + live keys; webhook endpoint pointing at prod `/api/payments/stripe/webhook`.
3. Rotate away Openpay keys per [`SECRET_ROTATION.md`](SECRET_ROTATION.md) after cutover (revoke Openpay private key when Stripe is live).
4. Connect Stripe MCP / Cursor Stripe plugin for agent-assisted Dashboard work (skills already preferred when coding).

---

## Recommended next `/goal` (implementation)

```text
Repo: https://github.com/feraranas/munch-app
Read: agent_docs/STRIPE_MIGRATION.md

/goal
Replace Openpay card charges with Stripe PaymentIntents + Payment Element for
diner split-pay (selected item_ids). Park Openpay completely in this PR.

Proof
1. Server creates PaymentIntent amount from order DB for item_ids only; client
   cannot over/under-charge.
2. Payment Element confirms; webhook marks Payment completed and updates
   partial/full paid state (reuse item_ids rules from #44).
3. Automated tests: intent for subset of lines; overlap → conflict; full pay →
   order paid; webhook signature failure rejected.
4. No Openpay.js / OPENPAY_* required for happy path; test mode works with
   Stripe test keys.
5. CLAUDE.md + FOLLOWUP_PLAN updated; APPLE_PAY.md marked superseded for rail.
6. PR against main; no TanStack / menu / unrelated scope.

Prefer Stripe agent skills (stripe-best-practices, stripe-docs) and Stripe MCP
when choosing Checkout Sessions vs PaymentIntents and when wiring Elements.
```

---

## Explicitly out of scope (this migration)

- TanStack Start
- OXXO / SPEI / MSI day one (add later via Stripe if product asks)
- Stripe Connect / multi-restaurant marketplace
- History rewrite of leaked Openpay secrets (rotation checklist only)


---

## MXN minimum charge and client errors (post-#48)

Stripe requires **at least $10.00 MXN** (1000 centavos) per PaymentIntent. See [minimum and maximum charge amounts](https://docs.stripe.com/currencies#minimum-and-maximum-charge-amounts).

`POST /api/payments/intents` (`createPaymentIntent`):

1. After computing amount from DB `item_ids` (and before inserting a `Payment` row), reject amounts below 1000 centavos with **HTTP 400** and:
   `{"error":"El pago mínimo con tarjeta es de $10.00 MXN. Agrega más productos a tu selección.","code":"amount_below_minimum","min_amount":1000,"amount":<centavos>}`.
   Same check on the mock path (no `STRIPE_SECRET_KEY`) so local UX matches prod.
2. Live Stripe create failures are mapped via `*stripe.Error` (`errors.As`):
   - `invalid_request_error` + `amount_too_small` → same **400** body (defense in depth; Payment row already exists in this path and is marked failed).
   - `card_error` → **402** with Stripe’s user-safe `Msg` (never secrets / raw internals).
   - Everything else → **502** generic `"Error al iniciar el pago con Stripe."` (full error still logged).

Frontend `createPaymentIntent` surfaces the JSON `error` string in the thrown `Error`; the pay CTA shows a small hint and disables when the selected total is under $10 MXN.
