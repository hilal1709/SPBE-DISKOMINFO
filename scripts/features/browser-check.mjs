// Anonymous browser smoke test. No login, form submit, mutation action, seed or migration.
// Uses the installed Chrome and a temporary profile with extensions disabled.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve, sep } from "node:path";

const browserPath = process.env.SPBE_TEST_BROWSER || "C:/Program Files/Google/Chrome/Application/chrome.exe";
assert(existsSync(browserPath), "Chrome not found; supply SPBE_TEST_BROWSER for this process only.");
const profile = mkdtempSync(join(tmpdir(), "spbe-portal-check-"));
const base = "http://localhost:3117";
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3117"], { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
let serverErrors = "";
server.stderr.on("data", (data) => { serverErrors += String(data); });
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
  await until(async () => serverReady && server.exitCode === null && (await fetch(base)).ok, "Production test server did not start (port may be occupied)");
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
    const timer = setTimeout(() => { pending.delete(id); rej(new Error(`CDP timeout: ${method}`)); }, 15000);
    pending.set(id, { resolve: res, reject: rej, timer }); socket.send(JSON.stringify({ id, method, params }));
  });
  closeBrowser = () => send("Browser.close").catch(() => {});
  const evaluate = async (expression) => {
    const response = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.text);
    return response.result?.value;
  };
  await send("Page.enable"); await send("Runtime.enable");
  const visit = async (path, expected) => {
    await send("Page.navigate", { url: base + path });
    await until(() => evaluate(`document.readyState === 'complete' && document.body.innerText.includes(${JSON.stringify(expected)})`), `Page not ready: ${path}`);
    await delay(1200);
    assert.equal(await evaluate("document.querySelectorAll('[fdprocessedid]').length"), 0);
  };
  await visit("/", "Ringkasan Umum");
  assert.equal(await evaluate("location.pathname"), "/");
  assert(await evaluate("document.body.innerText.includes('Ringkasan memerlukan akses Dashboard Keamanan')"));
  assert(await evaluate("document.querySelector('[data-hint=\"spbe:overview-hint\"]')?.textContent.includes('Ringkasan Arsitektur SPBE')"));
  await until(() => evaluate("!!document.querySelector('[data-hint=\"spbe:overview-hint\"] div[aria-hidden=true] svg')"), "Original overview Lottie did not render");
  assert.equal(await evaluate("document.querySelectorAll('[data-domain-enter]').length"), 0);
  console.log("PASS homepage and anonymous security restriction");
  await visit("/integrasi", "Integrasi Domain");
  assert(await evaluate("document.body.innerText.includes('Cakupan publik')"));
  // anime.js adds an accessibility copy when splitting the existing animated heading.
  assert(await evaluate("document.querySelector('h1').textContent.includes('Integrasi Domain') && !document.querySelector('h1').textContent.includes('Integrasi Antardomain')"));
  assert(!await evaluate("document.body.innerText.includes('Termasuk tidak langsung')"));
  assert(await evaluate("document.querySelector('[data-hint=\"spbe:integration-hint\"]')?.textContent.includes('Panduan Integrasi Domain')"));
  await until(() => evaluate("!!document.querySelector('[data-hint=\"spbe:integration-hint\"] div[aria-hidden=true] svg')"), "Original integration Lottie did not render");
  assert.equal(await evaluate("document.querySelectorAll('[data-domain-enter]').length"), 0);
  assert(!/Failed to set Next.js data cache|items over 2MB/.test(serverErrors), "Architecture data exceeded Next cache limit");
  console.log("PASS integration route, heading and public scope");
  await visit("/proses-bisnis", "Dashboard ini interaktif");
  const hasNew = await evaluate("!!document.querySelector('button[aria-label=\"Filter: Probis baru\"]')");
  assert(hasNew, "Interactive statistic button missing");
  await evaluate(`(() => {
    const input = document.querySelector('input[placeholder="Cari nama atau ID probis"]');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'GSK');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await delay(300);
  await evaluate("document.querySelector('button[aria-label=\"Filter: Probis baru\"]').click()");
  await until(() => evaluate("new URLSearchParams(location.search).get('status') === 'new'"), "Statistic did not apply filter");
  assert.equal(await evaluate("document.querySelector('button[aria-label=\"Hapus filter: Probis baru\"]')?.getAttribute('aria-pressed')"), "true");
  assert.equal(await evaluate("document.querySelector('input[placeholder=\"Cari nama atau ID probis\"]')?.value"), "GSK");
  assert(await evaluate("document.querySelector('button[aria-label=\"Halaman sebelumnya\"]')?.disabled"));
  await evaluate("document.querySelector('button[aria-label=\"Hapus filter: Probis baru\"]').click()");
  await until(() => evaluate("!new URLSearchParams(location.search).has('status')"), "Statistic did not toggle off");
  console.log("PASS statistic active state, URL filter, preserved search and first page");
  for (const route of ["layanan", "data", "aplikasi", "infrastruktur"]) {
    await visit(`/${route}`, "Dashboard ini interaktif");
    assert(await evaluate("document.querySelectorAll('button[aria-pressed]').length > 0"), `No interactive statistic: ${route}`);
  }
  for (const path of ["/keamanan", "/cms/aplikasi/baru"]) {
    await send("Page.navigate", { url: base + path });
    await until(() => evaluate("location.pathname === '/login'"), `Anonymous route protection failed: ${path}`);
  }
  const hydration = errors.filter((error) => /hydration|hydrating|Minified React error #(418|425)/i.test(error));
  assert.deepEqual(hydration, [], "Hydration error in clean browser");
  const runtimeErrors = errors.filter((error) => /Uncaught|TypeError|ReferenceError/i.test(error));
  assert.deepEqual(runtimeErrors, [], "Browser runtime error");
  console.log("PASS public routes, protected redirects and clean-browser hydration");
} finally {
  await closeBrowser?.();
  socket?.close(); chrome?.kill(); server.kill();
  await delay(700);
  const target = resolve(profile), parent = resolve(tmpdir());
  if (target.startsWith(parent + sep) && basename(target).startsWith("spbe-portal-check-")) {
    try { rmSync(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* Chrome may still hold a temporary lock. */ }
  }
}
