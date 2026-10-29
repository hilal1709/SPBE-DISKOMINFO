// Uji klik kartu Peta Rencana pada build production lokal. Tanpa mutasi database.
// node scripts/features/peta-rencana-browser-check.mjs (jalankan next build dahulu)
// Uses the installed Chrome and a temporary profile with extensions disabled.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve, sep } from "node:path";

const browserPath = process.env.SPBE_TEST_BROWSER || "C:/Program Files/Google/Chrome/Application/chrome.exe";
assert(existsSync(browserPath), "Chrome not found; supply SPBE_TEST_BROWSER for this process only.");
const profile = mkdtempSync(join(tmpdir(), "spbe-rencana-check-"));
const base = "http://localhost:3121";
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3121"], { windowsHide: true, env: { ...process.env, NODE_ENV: "production" }, stdio: ["ignore", "pipe", "pipe"] });
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
  await visit('/peta-rencana?tahun=2026&pd=DISKOMINFO&muatan=aplikasi', 'Total kegiatan');
  await until(() => evaluate(`!!document.querySelector('[aria-label="Periode"]')?.textContent`), 'Dashboard not hydrated');
  const checkContext = async () => assert.deepEqual(await evaluate(`(() => { const p = new URLSearchParams(location.search); return [p.get('tahun'), p.get('pd'), p.get('muatan')]; })()`), ['2026', 'DISKOMINFO', 'aplikasi']);
  const card = (label) => `Array.from(document.querySelectorAll('button[aria-pressed]')).find(b => b.getAttribute('aria-label').endsWith(': ' + ${JSON.stringify(label)}))`;
  const checkRows = async (label) => {
    assert(await evaluate(`document.querySelectorAll('tbody tr').length ? Array.from(document.querySelectorAll('tbody tr')).every(tr => tr.textContent.includes(${JSON.stringify(label)})) : document.body.innerText.includes('Tidak ada kegiatan')`));
  };
  for (const [label, status] of [['Terlaksana','terlaksana'], ['Berjalan','berjalan'], ['Ditunda','ditunda']]) {
    await click(card(label));
    await until(() => evaluate(`new URLSearchParams(location.search).get('status') === ${JSON.stringify(status)} && (${card(label)}).getAttribute('aria-pressed') === 'true'`), 'Card did not select its status');
    await checkContext(); await checkRows(label);
    assert(await evaluate(`!!document.querySelector('button[aria-label="Filter: Total kegiatan"]')`));
    console.log(`PASS ${label}: selected status, filtered rows, preserved year/PD/muatan and available Total card`);
  }
  await click(card('Ditunda'));
  await until(() => evaluate(`!new URLSearchParams(location.search).has('status')`), 'Second click did not clear status');
  await checkContext();
  await click(card('Berjalan'));
  await until(() => evaluate(`new URLSearchParams(location.search).get('status') === 'berjalan'`), 'Running filter missing');
  await click(card('Total kegiatan'));
  await until(() => evaluate(`!new URLSearchParams(location.search).has('status') && (${card('Total kegiatan')}).getAttribute('aria-pressed') === 'true'`), 'Total did not restore all statuses');
  await checkContext();
  console.log('PASS repeat click and Total clear only the status filter');
  const hydration = errors.filter((error) => /hydration|hydrating|Minified React error #(418|425)/i.test(error));
  assert.deepEqual(hydration, [], "Hydration error in clean browser");
  const runtimeErrors = errors.filter((error) => /Uncaught|TypeError|ReferenceError/i.test(error));
  assert.deepEqual(runtimeErrors, [], "Browser runtime error");
  console.log("PASS Peta Rencana statistic cards and clean-browser hydration");
} finally {
  await closeBrowser?.();
  socket?.close(); chrome?.kill(); server.kill();
  await delay(700);
  const target = resolve(profile), parent = resolve(tmpdir());
  if (target.startsWith(parent + sep) && basename(target).startsWith("spbe-rencana-check-")) {
    try { rmSync(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* Chrome may still hold a temporary lock. */ }
  }
}
