# Admin menu management

Staff manage the restaurant catalog at `/admin/menu`: add an item with name and price, edit it, and archive or re-activate it. Active items appear on the diner menu.

## Sub-features

- `menu-create` adds an item; it appears at the bottom of the admin list, in `/api/menu/items`, and on `/menu`.
- `menu-edit` changes name/price via `Editar` → `Guardar`.
- `menu-archive` `Archivar` marks the row `· Archivado` and removes it from `/menu` and `/api/menu/items`; `Activar` restores it.

## How to get to it (user POV)

- Log in, then open `/admin/menu` (Header title `Menú`, back arrow returns to `/admin`).

## Driving it with munchctl browser

Preconditions:

- Baseline; logged in via `login()`.

- **Open.** `page.goto(WEB + '/admin/menu')`. Heading `Agregar item` and row `Tacos al Pastor (3)` visible.
- **Create.** Fill placeholder `Nombre` = `Verify Tostada $RUN_ID`, `Precio` = `42.50`, click button `Crear`. Row `Verify Tostada $RUN_ID` / `$42.50` appears.
- **API check.** `GET /api/menu/items` body contains the name.
- **Diner view.** `page.goto(WEB + '/menu')`; heading with the name visible (scroll it into view).
- **Edit.** In that row click `Editar`, change the name input, click `Guardar`. Row shows the new name.
- **Archive.** Click `Archivar` in the row. Row shows `· Archivado` and button `Activar`; `/menu` no longer lists it.
- **Proof.** `scripts/munchctl browser journeys/admin-menu-create.mjs` covers Open/Create/API/Diner view (proven). Edit and Archive need a journey.

## Gotchas

- `/menu` scrolls inside an inner overflow div; full-page screenshots don't reach lower items — `scrollIntoViewIfNeeded()` first.
- Prices render with `$` and two decimals; assert `$42.50`, not `42.5`.
- Edit inputs have no placeholder or label; scope locators to the row being edited.
