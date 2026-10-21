#!/usr/bin/env node
// Runs a journey module (export default async ({page, ctx, shot, log, login}) => {...})
// in headless system Chrome against the munchctl instance. Artifacts go to $EVIDENCE_DIR/<journey-name>/.
import { createRequire } from 'module';
import path from 'path'; import fs from 'fs'; import { pathToFileURL } from 'url';
const require = createRequire(process.env.NODE_PATH + '/');
const { chromium } = require('playwright-core');
const journey = path.resolve(process.argv[2]);
const name = path.basename(journey, '.mjs');
const out = path.join(process.env.EVIDENCE_DIR, name); fs.mkdirSync(out, { recursive: true });
const logf = path.join(out, 'journey.log');
const log = (m) => { const l = `[${new Date().toISOString()}] ${m}`; console.log(l); fs.appendFileSync(logf, l + '\n'); };
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 430, height: 900 } });
const page = await ctx.newPage();
page.on('console', (m) => { if (m.type() === 'error') log(`console.error: ${m.text().split('\n')[0].slice(0,200)}`); });
let n = 0;
const shot = async (label) => { const f = path.join(out, `${String(++n).padStart(2, '0')}-${label}.png`); await page.screenshot({ path: f, fullPage: true }); fs.writeFileSync(f.replace(/\.png$/, '.aria.txt'), await page.locator('body').ariaSnapshot()); log(`shot ${f}`); };
const login = async () => {
  await page.goto(process.env.WEB + '/login');
  await page.locator('#username').fill(process.env.ADMIN_USER);
  await page.locator('#password').fill(process.env.ADMIN_PASS);
  await page.getByRole('button', { name: 'Iniciar Sesión' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 15000 });
  log(`logged in, now at ${page.url()}`);
};
let code = 0;
try { const mod = await import(pathToFileURL(journey)); await mod.default({ page, ctx, shot, log, login, env: process.env, out }); log('JOURNEY PASS'); }
catch (e) { code = 1; log('JOURNEY FAIL: ' + (e.stack || e)); try { await shot('failure'); } catch {} }
await browser.close(); process.exit(code);
