// Feature: admin-menu (see features/admin-menu.md). Staff creates a menu item at /admin/menu,
// then a diner sees it at /menu and the public API returns it (side-effect check).
export default async ({ page, shot, log, login, env }) => {
  const itemName = `Verify Tostada ${env.RUN_ID}`;
  await login();
  await page.goto(env.WEB + '/admin/menu');
  await page.getByRole('heading', { name: 'Agregar item' }).waitFor();
  await page.getByText('Tacos al Pastor (3)').first().waitFor();
  await shot('admin-menu-before');
  await page.getByPlaceholder('Nombre').fill(itemName);
  await page.getByPlaceholder('Precio').fill('42.50');
  await shot('admin-menu-filled');
  await page.getByRole('button', { name: 'Crear' }).click();
  await page.getByText(itemName).waitFor({ timeout: 15000 });
  await shot('admin-menu-after-create');
  // Side effect: public API
  const res = await fetch(env.API + '/api/menu/items'); const body = await res.text();
  if (!body.includes(itemName)) throw new Error('public API missing created item');
  require_fs().writeFileSync(env.EVIDENCE_DIR + '/admin-menu-create/api-menu-items.json', body);
  log(`API /api/menu/items contains "${itemName}"`);
  // Second user-facing view: diner menu
  await page.goto(env.WEB + '/menu');
  const h = page.getByRole('heading', { name: itemName });
  await h.waitFor({ timeout: 15000 });
  await h.scrollIntoViewIfNeeded(); // /menu scrolls inside an inner overflow div; fullPage won't reach it
  await shot('diner-menu-shows-item');
};
import fs from 'fs'; const require_fs = () => fs;
