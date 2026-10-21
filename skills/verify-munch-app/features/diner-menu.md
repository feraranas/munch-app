# Diner menu

Diners see the restaurant's active menu, with toppings and prices, without logging in.

## Sub-features

- `diner-menu-list` lists active items as headings with prices.
- `diner-menu-toppings` shows italic `+ <topping>` lines under items that have toppings.

## How to get to it (user POV)

- Open `/menu` (also reachable from the bottom navigation).

## Driving it with munchctl browser

Preconditions:

- Baseline; no login.

- **Open.** `page.goto(WEB + '/menu')`. Heading `Tacos al Pastor (3)` and price `$12.99` visible.
- **Toppings.** Text `+ Extra Piña` / `$1.50` visible under Tacos al Pastor.
- **Consistency.** Count of item headings equals `len(GET /api/menu/items .items)` (12 on a fresh DB).
- **Proof.** Screenshot + ARIA snapshot; save API body.

## Gotchas

- Inner scroll container — scroll items into view before screenshots.
- Archived items are excluded; run after any archive journey only if you expect fewer items.
- Indirectly exercised by the proven admin-menu journey (step 04); not separately driven.
