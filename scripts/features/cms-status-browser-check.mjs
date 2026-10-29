// Audit CMS baca-saja di dev server lokal terisolasi. Tidak mengirim form, mutasi, seed, atau migrasi.
// node --env-file=.env scripts/features/cms-status-browser-check.mjs
// Uses the installed Chrome and a temporary profile with extensions disabled.
import assert from "node:assert/strict";
import { Pool } from "pg";
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve, sep } from "node:path";

const browserPath = process.env.SPBE_TEST_BROWSER || "C:/Program Files/Google/Chrome/Application/chrome.exe";
assert(existsSync(browserPath), "Chrome not found; supply SPBE_TEST_BROWSER for this process only.");
const profile = mkdtempSync(join(tmpdir(), "spbe-cms-status-check-"));
const base = "http://localhost:3119";
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", "3119"], { windowsHide: true, env: { ...process.env, NODE_ENV: "development", AUTH_REQUIRED: "false", NEXT_DIST_DIR: ".next-strix/cms-status-audit" }, stdio: ["ignore", "pipe", "pipe"] });
server.stderr.resume();
let serverReady = false;
server.stdout.on("data", (data) => { if (String(data).includes("Ready in")) serverReady = true; });
let chrome, socket, closeBrowser;
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, message, timeout = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try { const value = await fn(); if (value) return value; } catch { /* server/page still starting */ }
    await delay(200);
  }
  throw new Error(message);
}
try {
  await until(async () => serverReady && server.exitCode === null && (await fetch(base)).ok, "Local audit server did not start (port may be occupied)", 180000);
  chrome = spawn(browserPath, ["--headless=new", "--disable-extensions", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--remote-debugging-address=127.0.0.1", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"], { windowsHide: true, stdio: "ignore" });
  const debugFile = join(profile, "DevToolsActivePort");
  const debugPort = await until(() => existsSync(debugFile) && Number(readFileSync(debugFile, "utf8").split("\n")[0]), "Chrome debugging port unavailable");
  const target = await until(async () => {
    const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
    return targets.find((t) => t.type === "page");
  }, "Headless Chrome did not start");
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { socket.addEventListener("open", res, { once: true }); socket.addEventListener("error", rej, { once: true }); });
  let nextId = 0;
  const pending = new Map();
  const errors = [];
  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(String(data));
    if (message.id) {
      const task = pending.get(message.id); if (!task) return;
      pending.delete(message.id); clearTimeout(task.timer);
      if (message.error) task.reject(new Error(message.error.message)); else task.resolve(message.result);
    }
    if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
    if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") errors.push(message.params.args.map((a) => a.value ?? a.description ?? "").join(" "));
  });
  const send = (method, params = {}) => new Promise((res, rej) => {
    const id = ++nextId;
    const timer = setTimeout(() => { pending.delete(id); rej(new Error(`CDP timeout: ${method}`)); }, method === "Page.navigate" ? 180000 : 30000);
    pending.set(id, { resolve: res, reject: rej, timer }); socket.send(JSON.stringify({ id, method, params }));
  });
  closeBrowser = () => send("Browser.close").catch(() => {});
  const evaluate = async (expression) => {
    const response = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.text);
    return response.result?.value;
  };
  const click = async (expression) => {
    const point = await evaluate(`(() => { const element = ${expression}; element.scrollIntoView({ block: 'center' }); const r = element.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", ...point });
    await send("Input.dispatchMouseEvent", { type: "mousePressed", ...point, button: "left", clickCount: 1 });
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", ...point, button: "left", clickCount: 1 });
  };
  await send("Page.enable"); await send("Runtime.enable");
  const visit = async (path, expected) => {
    await send("Page.navigate", { url: base + path });
    await until(() => evaluate(`document.readyState === 'complete' && document.body.innerText.includes(${JSON.stringify(expected)})`), `Page not ready: ${path}`, 180000);
    await delay(1200);
    assert.equal(await evaluate("document.querySelectorAll('[fdprocessedid]').length"), 0);
  };
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: /sslmode=disable/.test(process.env.DATABASE_URL ?? "") ? false : process.env.DATABASE_CA
      ? { ca: process.env.DATABASE_CA.replace(/\\n/g, "\n"), rejectUnauthorized: true } : { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000, statement_timeout: 10000, max: 1,
  });
  try {
    const client = await pool.connect();
    try {
      await client.query("begin read only");
      const { rows: periods } = await client.query("select name from architecture_periods where is_active");
      const active = periods[0]?.name;
      assert(active, "No active architecture period");
      const tabCount = () => evaluate(`Number(Array.from(document.querySelectorAll('[role="tab"]')).find(t => t.textContent.startsWith('Diajukan'))?.textContent.match(/\\d+$/)?.[0] ?? -1)`);
      const selectPeriod = async (period) => {
        await click(`document.querySelector('[role="combobox"][aria-label="Periode"]')`);
        await until(() => evaluate(`Array.from(document.querySelectorAll('[role="option"]')).some(o => o.textContent === ${JSON.stringify(period)})`), "Period option unavailable");
        await click(`Array.from(document.querySelectorAll('[role="option"]')).find(o => o.textContent === ${JSON.stringify(period)})`);
      };
      for (const [domain, table] of [["proses-bisnis", "process_businesses"], ["layanan", "services"], ["data", "datasets"], ["aplikasi", "applications"], ["infrastruktur", "infrastructures"], ["keamanan", "security_activities"]]) {
        const { rows: [expected] } = await client.query(`select count(*)::int as total, count(*) filter (where ap.name=$1)::int as active from ${table} t join architecture_periods ap on ap.id=t.period_id where t.status='submitted'`, [active]);
        await visit(`/cms/${domain}`, "Diajukan");
        await until(() => evaluate(`document.querySelector('[role="combobox"][aria-label="Periode"]')?.textContent === 'Semua'`), `${domain}: default period label is not Semua`, 90000);
        assert.equal(await tabCount(), expected.total, `${domain}: default count must match verification queue`);
        await click(`Array.from(document.querySelectorAll('[role="tab"]')).find(t => t.textContent.startsWith('Diajukan'))`);
        await until(() => evaluate(`new URLSearchParams(location.search).get('tab') === 'submitted'`), "Submitted tab not selected");
        await selectPeriod(active);
        await until(async () => await tabCount() === expected.active, `${domain}: active period count mismatch`);
        await selectPeriod("Semua");
        await until(async () => await tabCount() === expected.total, `${domain}: all periods count mismatch`);
        console.log(`PASS ${domain}: default/all periods = ${expected.total}; active period = ${expected.active}`);
      }
    } finally {
      await client.query("rollback");
      client.release();
    }
  } finally {
    await pool.end();
  }
  const hydration = errors.filter((error) => /hydration|hydrating|Minified React error #(418|425)/i.test(error));
  assert.deepEqual(hydration, [], "Hydration error in clean browser");
  const runtimeErrors = errors.filter((error) => /Uncaught|TypeError|ReferenceError/i.test(error));
  assert.deepEqual(runtimeErrors, [], "Browser runtime error");
  console.log("PASS six CMS lists, submitted counts, period filters and hydration");
} finally {
  await closeBrowser?.();
  socket?.close(); chrome?.kill(); server.kill();
  await delay(700);
  const target = resolve(profile), parent = resolve(tmpdir());
  if (target.startsWith(parent + sep) && basename(target).startsWith("spbe-cms-status-check-")) {
    try { rmSync(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* Chrome may still hold a temporary lock. */ }
  }
}
