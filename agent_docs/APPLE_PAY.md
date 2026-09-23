# Apple Pay beside Openpay — design (no implementation yet)

**Status:** design + support ask only. Do **not** implement until Openpay MX confirms a wallet path (or Ferdinand picks an alternate rail).  
**Repo:** `feraranas/munch-app`  
**Related:** `agent_docs/FOLLOWUP_PLAN.md` §2  
**Written:** 2026-09-23 (CT)

---

## Current payment path (what must stay unchanged)

1. Diner selects claimed lines on the check → frontend builds `item_ids`.
2. Card form: Openpay.js tokenizes PAN → `token_id` (+ `device_session_id` when keys are set).
3. `POST /api/payments/charge` with `{ order_id, token_id, item_ids, device_session_id? }`.
4. Backend:
   - Amount from order DB for those `item_ids` only (`payment.go` / `amountForMenuIDs`) — **never** trust client amount.
   - Reject overlap with already-completed `Payment.ItemIDs`.
   - If Openpay keys unset → mock complete (`tok_mock_local` path).
   - Else `OpenpayService.CreateCharge` with `method: "card"`, `source_id` = Openpay token.
5. Persist `Payment` + `item_ids`; mark order `paid` only when every line is covered; WS peers see payment state.

**Invariant for any Apple Pay work:** same charge endpoint contract for amount/item selection; card path regression-tested; no stuffing a raw Apple `PKPaymentToken` into `source_id`.

---

## What public Openpay MX docs say (as of 2026-09-23)

Reviewed Openpay MX charge docs / OpenAPI sketches:

- Charge `method` values documented: **`card`**, **`store`**, **`bank_account`** (plus Alipay in some pages). **No `apple_pay` / wallet method.**
- Card charges require `source_id` = saved card id **or** Openpay-created **token** (from card fields via tokens API / Openpay.js).
- Tokens API expects card_number, holder, expiry, cvv2 — not an Apple Pay cryptogram blob.

**Conclusion from public docs alone:** there is **no documented** “pass Apple Pay payment token as `source_id`” path for MX merchants. Implementation without vendor confirmation would be guessing.

Support contact (from Openpay docs): **soporte@openpay.mx** — also merchant dashboard / account manager if you have one.

---

## Decision tree (after support replies)

| Openpay answer | Product path |
|----------------|--------------|
| A. Native Apple Pay / wallet token → Openpay charge | Add payment-method adapter; Safari Payment Request / Apple Pay JS; map confirmed payload into Openpay charge fields they specify. |
| B. Decrypt Apple token yourself, then create an Openpay **card token** / charge with network cryptogram fields they document | Higher PCI / crypto key custody; only if they document merchant-decrypt. Prefer processor-decrypt if offered. |
| C. Not supported on MX for this merchant type | Keep Openpay for cards; evaluate **alternate rail** for Apple Pay only (separate adapter), or defer Apple Pay. |
| D. Partner / 3DS / redirect only | Document UX and do not force into `/charge` card shape. |

Default until answered: **stay on card + local mock**; no Apple Pay UI.

---

## Target architecture (if A or B)

```
PaymentForm
  ├─ CardRail (existing Openpay.js → token_id)
  └─ ApplePayRail (Safari / Payment Request → apple_pay payload)
         │
         ▼
POST /api/payments/charge
  body: {
    order_id,
    item_ids,          // unchanged — selected claimed lines
    method: "card_token" | "apple_pay",
    // card_token: token_id + device_session_id
    // apple_pay: fields Openpay confirms (never raw PKPaymentToken as source_id unless they say so)
  }
         │
         ▼
PaymentAdapter
  ├─ CardToken → Openpay CreateCharge method=card source_id=token
  └─ ApplePay  → Openpay (or other) per support answer
         │
         ▼
same Payment row + item_ids + order paid/partial rules
```

**Product gates (implementation PR, later)**

- Apple Merchant ID + domain verification on the production HTTPS host.
- MX country / network enablement; Safari (and any allowed browsers).
- Fallback: existing card form always available.
- Amount still server-side from order + `item_ids`.
- Decline / cancel / unsupported device paths documented in PR test plan.

---

## Proof checklist (implementation PR — do not start yet)

1. Adapter selects rail by `method`; card path regression tests green.
2. Amount never client-trusted; split-pay `item_ids` rules unchanged.
3. Manual smoke: Apple Pay success + decline documented; card happy path unchanged.
4. No TanStack / menu / unrelated scope.

---

## Support email draft

Copy/paste to **soporte@openpay.mx** (or your AM). Spanish + English below.

### Español

Asunto: Apple Pay / tokens de wallet para cargos con Openpay MX

Hola,

Somos un comercio MX (QR / división de cuenta en restaurante). Hoy tokenizamos tarjetas con Openpay.js y cobramos con `method: "card"` y `source_id` = token.

¿Openpay México soporta Apple Pay (Safari / Payment Request) para comercios como el nuestro?

Necesitamos saber en concreto:

1. ¿Existe un flujo documentado para cobrar un pago Apple Pay (token / cryptogram) vía la API de charges?
2. Si sí: ¿qué campos enviamos (¿`method`, `source_id`, u otros)? ¿Hay que descifrar el `PKPaymentToken` del lado del comercio o lo hace Openpay / un partner?
3. Si no: ¿recomiendan un partner o un método alterno, o Apple Pay no está disponible en MX para este producto?

Gracias,

Ferdinand Arana  
feraranas / Munch

### English

Subject: Apple Pay / wallet tokens for Openpay MX charges

Hi,

We are a Mexico merchant (restaurant QR bill-split). Today we tokenize cards with Openpay.js and charge with `method: "card"` and `source_id` = token.

Does Openpay Mexico support Apple Pay (Safari / Payment Request) for merchants like us?

Specifically:

1. Is there a documented way to charge an Apple Pay payment (token / cryptogram) via the charges API?
2. If yes: which fields do we send (`method`, `source_id`, or others)? Do we merchant-decrypt the `PKPaymentToken`, or does Openpay / a partner handle that?
3. If no: do you recommend a partner / alternate method, or is Apple Pay unavailable on MX for this product?

Thanks,

Ferdinand Arana  
feraranas / Munch

---

## Out of scope for this doc PR

- Implementing Apple Pay UI or charge adapter.
- Changing Openpay card flow.
- TanStack migration.
- Secret rotation (see `agent_docs/SECRET_ROTATION.md` if present).
