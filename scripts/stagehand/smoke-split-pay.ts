/**
 * Opt-in diner payment smoke. Not a PR CI gate.
 *
 * Pass/fail is GET /api/qr/:id paid_item_ids (and the $10-minimum copy existing
 * on the page). Stagehand extract() is debug-only — it hallucinates Pagado.
 *
 * Stripe Payment Element fields are filled via CDP into js.stripe.com iframes
 * (stripe-cdp-fill.ts), not act()/type().
 */
import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod/v4";
import { localBrowser, Stagehand } from "@browserbasehq/stagehand";
import { fillStripePaymentElement } from "./stripe-cdp-fill.ts";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "../..");
const outDir = join(here, "out");

function loadEnvFile(path: string) {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return;
  }
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq);
    let value = line.slice(eq + 1);
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(join(repoRoot, "backend/.env"));

const API = process.env.MUNCH_API_URL || "http://localhost:8080";
const APP = process.env.MUNCH_APP_URL || "http://localhost:3000";
const CDP_PORT = Number(process.env.STAGEHAND_CDP_PORT || 9333);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY missing (expected in backend/.env)");
}

async function api(
  method: string,
  path: string,
  body?: unknown,
  token?: string
): Promise<{ status: number; json: any }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json: any = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text.slice(0, 400) };
  }
  return { status: res.status, json };
}

async function setupOrder(): Promise<{ qrId: string; checkUrl: string }> {
  const login = await api("POST", "/api/auth/login", {
    username: "admin",
    password: "admin123",
  });
  if (login.status !== 200 || !login.json.token) {
    throw new Error(`login failed ${login.status}`);
  }
  const token = login.json.token as string;

  const qr = await api(
    "POST",
    "/api/qr/create",
    { tableNumber: "stagehand_smoke" },
    token
  );
  if (qr.status !== 200 && qr.status !== 201) {
    throw new Error(`qr create failed ${qr.status} ${JSON.stringify(qr.json)}`);
  }
  const qrId = (qr.json.qrId || qr.json.qr_id) as string;

  const order = await api(
    "POST",
    "/api/pos/order",
    {
      qrId,
      selectedItems: [
        { id: "agua_jamaica", menuId: "sh_jamaica", qty: 1 },
        { id: "tacos_pastor", menuId: "sh_tacos", qty: 1 },
      ],
    },
    token
  );
  if (order.status !== 200 && order.status !== 201) {
    throw new Error(`pos order failed ${order.status} ${JSON.stringify(order.json)}`);
  }
  console.log("setup qr", qrId, "order", order.json.id);
  return { qrId, checkUrl: `${APP}/check/${qrId}` };
}

function startStripeListen(): Promise<() => void> {
  return new Promise((resolve) => {
    const child: ChildProcess = spawn(
      "stripe",
      [
        "listen",
        "--forward-to",
        "localhost:8080/api/payments/stripe/webhook",
        "--events",
        "payment_intent.succeeded,payment_intent.payment_failed",
      ],
      { stdio: ["ignore", "pipe", "pipe"] }
    );
    let settled = false;
    const done = (stop: () => void) => {
      if (settled) return;
      settled = true;
      resolve(stop);
    };
    const timer = setTimeout(() => {
      console.warn("stripe listen did not become Ready in 12s");
      done(() => child.kill("SIGTERM"));
    }, 12000);
    const onChunk = (buf: Buffer) => {
      const text = buf.toString();
      if (text.includes("Ready!")) {
        clearTimeout(timer);
        console.log("stripe listen Ready");
        done(() => child.kill("SIGTERM"));
      }
      if (text.includes("Authorization failed") || text.includes("expired OAuth")) {
        clearTimeout(timer);
        console.warn("stripe listen 401 — run `stripe login`; webhook may not mark items paid");
        child.kill("SIGTERM");
        done(() => undefined);
      }
    };
    child.stdout?.on("data", onChunk);
    child.stderr?.on("data", onChunk);
    child.on("exit", () => {
      if (!settled) {
        clearTimeout(timer);
        done(() => undefined);
      }
    });
  });
}

async function shot(page: { screenshot: (opts?: { path?: string }) => Promise<unknown> }, name: string) {
  mkdirSync(outDir, { recursive: true });
  const path = join(outDir, `${name}.png`);
  try {
    const buf = await page.screenshot();
    if (buf && typeof buf !== "string" && (buf as ArrayBuffer).byteLength) {
      writeFileSync(path, Buffer.from(buf as ArrayBuffer));
    } else {
      await page.screenshot({ path });
    }
    console.log("screenshot", path);
  } catch (err) {
    console.warn("screenshot failed", name, err);
  }
}

async function main() {
  const stopListen = await startStripeListen();
  let browser: Awaited<ReturnType<typeof localBrowser.launch>> | undefined;
  let stagehand: Stagehand | undefined;
  try {
  const { checkUrl, qrId } = await setupOrder();

  browser = await localBrowser.launch({
    headless: false,
    port: CDP_PORT,
  });
  stagehand = await Stagehand.create({
    browser,
    model: {
      modelName: process.env.STAGEHAND_MODEL || "openai/gpt-4o-mini",
      apiKey: OPENAI_API_KEY,
    },
    logging: { level: "info", format: "pretty" },
  });

  {
    const pages = await browser.context.pages();
    const page = pages[0];
    if (!page) throw new Error("no active page");

    await page.goto(checkUrl);
    console.log("opened", checkUrl);
    await new Promise((r) => setTimeout(r, 2500));
    await shot(page, "01-check");

    await stagehand.act("Click the row for Agua de Jamaica");
    await new Promise((r) => setTimeout(r, 800));
    await shot(page, "02-jamaica-claimed");

    const under = await stagehand.extract(
      "Read the payment bar at the bottom: the total and any warning about a $10 minimum.",
      z.object({
        totalText: z.string(),
        hint: z.string().nullable(),
        pagarEnabled: z.boolean(),
      })
    );
    console.log("under-$10 extract", under.data);
    const underBlob = `${under.data.hint ?? ""} ${under.data.totalText}`;
    if (!underBlob.includes("10.00") && !underBlob.toLowerCase().includes("mínimo")) {
      throw new Error(`expected $10 minimum hint, got: ${JSON.stringify(under.data)}`);
    }
    console.log("PASS under-$10 amber hint");

    await stagehand.act("Click the row for Tacos al Pastor");
    await new Promise((r) => setTimeout(r, 800));
    await shot(page, "03-tacos-claimed");

    const over = await stagehand.extract(
      "Read the payment bar total. Is there still a $10 minimum warning?",
      z.object({
        totalText: z.string(),
        hasMinimumHint: z.boolean(),
      })
    );
    console.log("≥$10 extract", over.data);
    const overBlob = over.data.totalText.toLowerCase();
    const stillHinted =
      over.data.hasMinimumHint &&
      (overBlob.includes("mínimo") || overBlob.includes("minimo"));
    if (stillHinted) {
      throw new Error("minimum hint should be gone once selection is ≥ $10");
    }

    await stagehand.act("Click the Pagar button");
    await new Promise((r) => setTimeout(r, 4000));
    await shot(page, "04-payment-sheet");

    await fillStripePaymentElement(CDP_PORT);
    await shot(page, "05-card-filled");

    const clicked = await page.evaluate(
      `(() => {
        const btn = [...document.querySelectorAll('button')].find((el) =>
          /pagar ahora/i.test(el.textContent || '')
        );
        if (!btn) return false;
        btn.click();
        return true;
      })()`
    );
    console.log("clicked Pagar ahora", clicked);
    if (!clicked) {
      await stagehand.act("Click the blue Pagar ahora button");
    }
    await new Promise((r) => setTimeout(r, 3000));
    await Promise.race([
      shot(page, "06-after-pay"),
      new Promise((resolve) => setTimeout(resolve, 4000)),
    ]);

    const paid = await stagehand.extract(
      "Which order lines show Pagado? List item names that are marked paid.",
      z.object({
        paidItems: z.array(z.string()),
        successVisible: z.boolean(),
      })
    );
    console.log("paid extract", paid.data);

    let ids: string[] = [];
    for (let i = 0; i < 15; i++) {
      const session = await api("GET", `/api/qr/${qrId}`);
      ids = session.json.paid_item_ids || [];
      console.log("api paid_item_ids", ids);
      if (ids.length > 0) break;
      await new Promise((r) => setTimeout(r, 1000));
    }
    if (ids.length === 0) {
      throw new Error(
        "Payment Element did not complete: paid_item_ids still empty (Stripe iframe fill likely failed)"
      );
    }
    console.log("PASS paid_item_ids from API", ids);
    console.log("SMOKE_DONE", checkUrl);
  }
  } finally {
    if (stagehand) await stagehand.close();
    if (browser) await browser.close();
    stopListen();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
