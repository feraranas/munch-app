# Secret rotation checklist (post d74)

**Why:** Openpay and/or JWT material appeared in git history around `fix/d74-credential-token-leak` (merged as PR #38). Code fixes remove future leaks; **history still may contain old values** until rotated and (optionally) history rewritten.

**Status:** ops checklist — not a feature PR. Do this in the live merchant / hosting accounts.

**Note (2026-09-23):** After Stripe cutover, rotate/revoke **Openpay** keys as part of decommissioning; add Stripe secret/publishable/webhook secrets to env (never commit). See [`STRIPE_MIGRATION.md`](STRIPE_MIGRATION.md).

**Written:** 2026-09-23 (CT)

---

## 1. Inventory (what to rotate)

| Secret | Where used | Rotate in |
|--------|------------|-----------|
| Openpay **private** API key | Backend `OPENPAY_PRIVATE_KEY` / charge Basic Auth | Openpay dashboard → API keys → regenerate private key |
| Openpay **public** API key | Frontend `REACT_APP_OPENPAY_*` / Openpay.js | Same dashboard (public key pair with private) |
| Openpay merchant id | Config (usually stable) | Confirm; rotate only if Openpay says to |
| **JWT signing secret** | Backend `JWT_SECRET` / staff auth | Hosting env (Railway/Fly/etc.) — generate new random ≥32 bytes |
| Any DB passwords / `.env` copies that lived in old commits | Deploy + local | Hosting + rotate DB if ever committed |

Do **not** commit new secret values. Prefer platform secret stores / env vars.

---

## 2. Procedure (recommended order)

1. **Confirm exposure:** from a clean clone, search history for known prefixes (do not paste live secrets into chat):
   ```bash
   git log -p --all -S 'OPENPAY' -- '*.env*' '*config*' | head
   # or: git rev-list --all | xargs git grep -l 'sk_'  # adjust to your key shape
   ```
2. **Openpay:** create new key pair in dashboard; keep old key valid until cutover if the UI allows overlap.
3. **Deploy:** set new `OPENPAY_*` + new `JWT_SECRET` on every environment (prod first or staging→prod).
4. **Restart** backend (and rebuild frontend if public key is bake-time `REACT_APP_*`).
5. **Smoke:** staff login (new JWT secret invalidates old tokens — expected); card tokenize + charge in sandbox; one live small charge if needed.
6. **Revoke** old Openpay private key in the dashboard.
7. **Local:** wipe old `.env` / shell history on laptops that ever had the leaked values.
8. **Optional hard purge:** `git filter-repo` / BFG only if legal/ops requires removing blobs from GitHub; coordinate force-push and re-clone for all contributors. Usually **rotation alone is enough**.

---

## 3. Done when

- [ ] New Openpay private + public keys live in prod env only
- [ ] Old Openpay private key revoked
- [ ] New JWT secret live; old staff sessions re-login
- [ ] Sandbox + one prod smoke charge OK
- [ ] Local `.env` files updated / old values discarded
- [ ] (Optional) history purge completed and documented

---

## 4. Out of scope

- Rewriting application payment logic
- Apple Pay (see `APPLE_PAY.md`)
- Committing replacement secrets to the repo
