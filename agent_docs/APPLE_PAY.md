# Apple Pay — SUPERSEDED for processor choice

**Status (2026-09-23):** Openpay is parked. Apple Pay will ride **Stripe** (Payment Element / Dashboard wallets) after the card migration in [`STRIPE_MIGRATION.md`](STRIPE_MIGRATION.md).  
**Do not** email Openpay support for Apple Pay or stuff `PKPaymentToken` into Openpay `source_id`.

## When to reopen this doc

After Stripe card charges work in prod: add a short section (or new PR) for:

1. Enable Apple Pay in Stripe Dashboard for the Mexico account.
2. Domain verification on the production HTTPS host.
3. Confirm Payment Element shows Apple Pay on Safari iPhone.
4. Same `item_ids` / amount invariants as card.

## Historical Openpay notes

Previously we researched Openpay MX public docs and found no documented Apple Pay → `source_id` path. That research is obsolete as a product path now that Stripe is the chosen rail. Old support-email drafts to `soporte@openpay.mx` should **not** be sent for this goal.
