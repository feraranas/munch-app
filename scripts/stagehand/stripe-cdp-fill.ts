/**
 * Stripe Payment Element fields live in cross-origin js.stripe.com iframes.
 * Stagehand act/type cannot reach them. Fill via CDP against those iframe targets.
 */

type CdpTarget = {
  id: string;
  type: string;
  url: string;
  title: string;
  webSocketDebuggerUrl?: string;
};

type Pending = {
  resolve: (value: unknown) => void;
  reject: (err: Error) => void;
};

class CdpConn {
  private ws: WebSocket;
  private nextId = 0;
  private pending = new Map<number, Pending>();
  private sessions = new Map<string, Map<number, Pending>>();

  private constructor(ws: WebSocket) {
    this.ws = ws;
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(String(ev.data));
      const map = msg.sessionId ? this.sessions.get(msg.sessionId) : this.pending;
      if (!map) return;
      const p = map.get(msg.id);
      if (!p) return;
      map.delete(msg.id);
      if (msg.error) {
        p.reject(new Error(`${msg.error.message || JSON.stringify(msg.error)}`));
      } else {
        p.resolve(msg.result);
      }
    });
  }

  static async connect(url: string): Promise<CdpConn> {
    const ws = new WebSocket(url);
    await new Promise<void>((resolve, reject) => {
      ws.addEventListener("open", () => resolve(), { once: true });
      ws.addEventListener("error", () => reject(new Error(`cdp connect failed ${url}`)), {
        once: true,
      });
    });
    return new CdpConn(ws);
  }

  send(method: string, params?: Record<string, unknown>, sessionId?: string): Promise<any> {
    const id = ++this.nextId;
    const map = sessionId
      ? this.sessions.get(sessionId) ??
        (() => {
          const m = new Map<number, Pending>();
          this.sessions.set(sessionId, m);
          return m;
        })()
      : this.pending;
    const payload: Record<string, unknown> = { id, method, params: params ?? {} };
    if (sessionId) payload.sessionId = sessionId;
    this.ws.send(JSON.stringify(payload));
    return new Promise((resolve, reject) => {
      map.set(id, { resolve, reject });
      setTimeout(() => {
        if (map.has(id)) {
          map.delete(id);
          reject(new Error(`cdp timeout ${method}`));
        }
      }, 10000);
    });
  }

  close() {
    this.ws.close();
  }
}

async function jsonList(port: number): Promise<CdpTarget[]> {
  const res = await fetch(`http://127.0.0.1:${port}/json/list`);
  if (!res.ok) throw new Error(`/json/list ${res.status}`);
  return res.json();
}

async function jsonVersion(port: number): Promise<{ webSocketDebuggerUrl: string }> {
  const res = await fetch(`http://127.0.0.1:${port}/json/version`);
  if (!res.ok) throw new Error(`/json/version ${res.status}`);
  return res.json();
}

function isStripeFrame(t: CdpTarget): boolean {
  const blob = `${t.url} ${t.title}`.toLowerCase();
  return (
    (t.type === "iframe" || t.type === "page") &&
    (blob.includes("stripe.com") || blob.includes("stripe.network"))
  );
}

async function waitForStripeTargets(port: number, timeoutMs = 20000): Promise<CdpTarget[]> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const list = await jsonList(port);
    const frames = list.filter(isStripeFrame);
    if (frames.length > 0) return frames;
    await new Promise((r) => setTimeout(r, 400));
  }
  const list = await jsonList(port);
  console.log(
    "cdp targets",
    list.map((t) => ({ type: t.type, title: t.title, url: t.url.slice(0, 80) }))
  );
  throw new Error("no Stripe iframe targets on CDP");
}

async function fillInSession(
  cdp: CdpConn,
  sessionId: string | undefined,
  card: string,
  exp: string,
  cvc: string
): Promise<string[]> {
  const filled: string[] = [];
  const info = await cdp.send(
    "Runtime.evaluate",
    {
      expression: `(() => {
        const inputs = [...document.querySelectorAll('input:not([type=hidden])')];
        return inputs.map((i) => ({
          autocomplete: i.autocomplete || '',
          name: i.name || '',
          placeholder: i.placeholder || '',
          type: i.type || '',
        }));
      })()`,
      returnByValue: true,
    },
    sessionId
  );
  const inputs = (info?.result?.value ?? []) as Array<{
    autocomplete: string;
    name: string;
    placeholder: string;
    type: string;
  }>;
  console.log("stripe iframe inputs", inputs);

  const pick = (kind: "number" | "exp" | "cvc") => {
    const tests: Record<typeof kind, (i: (typeof inputs)[0]) => boolean> = {
      number: (i) =>
        /cc-number|number/i.test(`${i.autocomplete} ${i.name} ${i.placeholder}`),
      exp: (i) =>
        /cc-exp|expir/i.test(`${i.autocomplete} ${i.name} ${i.placeholder}`),
      cvc: (i) =>
        /cc-csc|cvc|cvv|seguridad/i.test(`${i.autocomplete} ${i.name} ${i.placeholder}`),
    };
    const idx = inputs.findIndex(tests[kind]);
    return idx >= 0 ? idx : kind === "number" && inputs.length === 1 ? 0 : -1;
  };

  const setValue = async (index: number, value: string, label: string) => {
    await cdp.send(
      "Runtime.evaluate",
      {
        expression: `(() => {
          const inputs = [...document.querySelectorAll('input:not([type=hidden])')];
          const input = inputs[${index}];
          if (!input) return { ok: false };
          input.focus();
          input.select();
          return { ok: true };
        })()`,
        returnByValue: true,
        userGesture: true,
      },
      sessionId
    );
    await cdp.send(
      "Input.dispatchKeyEvent",
      { type: "keyDown", key: "Backspace" },
      sessionId
    );
    await cdp.send(
      "Input.dispatchKeyEvent",
      { type: "keyUp", key: "Backspace" },
      sessionId
    );
    await cdp.send("Input.insertText", { text: value }, sessionId);
    const check = await cdp.send(
      "Runtime.evaluate",
      {
        expression: `document.querySelectorAll('input:not([type=hidden])')[${index}]?.value`,
        returnByValue: true,
      },
      sessionId
    );
    console.log("fill", label, check?.result?.value);
    filled.push(label);
  };

  const n = pick("number");
  const e = pick("exp");
  const c = pick("cvc");
  if (n >= 0) await setValue(n, card, "number");
  if (e >= 0) await setValue(e, exp, "exp");
  if (c >= 0) await setValue(c, cvc, "cvc");
  if (n < 0 && e < 0 && c < 0 && inputs.length > 0) {
    await setValue(0, card, "first-input");
  }
  return filled;
}

export async function fillStripePaymentElement(
  port: number,
  card = "4242424242424242",
  exp = "1228",
  cvc = "123"
): Promise<void> {
  const frames = await waitForStripeTargets(port);
  console.log(
    "stripe frames",
    frames.map((f) => ({ title: f.title, url: f.url.slice(0, 100) }))
  );

  const version = await jsonVersion(port);
  const browser = await CdpConn.connect(version.webSocketDebuggerUrl);
  try {
    const attached: string[] = [];
    for (const frame of frames) {
      try {
        const { sessionId } = await browser.send("Target.attachToTarget", {
          targetId: frame.id,
          flatten: true,
        });
        attached.push(sessionId);
        await fillInSession(browser, sessionId, card, exp, cvc);
      } catch (err) {
        if (frame.webSocketDebuggerUrl) {
          const direct = await CdpConn.connect(frame.webSocketDebuggerUrl);
          try {
            await fillInSession(direct, undefined, card, exp, cvc);
          } finally {
            direct.close();
          }
        } else {
          throw err;
        }
      }
    }
  } finally {
    browser.close();
  }
}
