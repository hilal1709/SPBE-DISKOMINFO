// Uji otorisasi aktif ke build produksi + database UJI (CI atau lokal): login per peran, sapu semua server action,
// IDOR antar-OPD, halaman Pengaturan, pencabutan sesi, wajib ganti sandi, CSRF, open redirect, rate limit login.
// Prasyarat: aplikasi berjalan di BASE_URL, akun uji dari scripts/strix/seed-test-users.mts (strix_runs/akun-uji.txt).
// Jalankan: BASE_URL=http://localhost:3100 DATABASE_URL=postgres://…@localhost:…/spbe?sslmode=disable tsx scripts/security/authz-probe.mts
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const DB_URL = process.env.DATABASE_URL ?? "";
// Pengaman: skrip ini mengubah status akun uji; tidak boleh menyentuh database selain lokal.
if (!/@(localhost|127\.0\.0\.1)(:\d+)?\//.test(DB_URL)) throw new Error("DATABASE_URL harus database uji di localhost.");
const root = path.resolve(import.meta.dirname, "../..");
const outDir = path.join(root, process.env.REPORT_DIR ?? "security-reports");
const NIL = "00000000-0000-0000-0000-000000000000";

type Result = { area: string; check: string; status: "PASS" | "FAIL" | "REVIEW"; detail: string };
const results: Result[] = [];
const record = (area: string, check: string, status: Result["status"], detail = "") => {
  results.push({ area, check, status, detail });
  console.log(`${status.padEnd(6)} ${area} · ${check}${detail ? ` — ${detail}` : ""}`);
};

// ---- akun uji -------------------------------------------------------------------------------------------------
type Account = { role: string; opd?: string; email: string; password: string; cookie?: string };
const accounts: Account[] = fs.readFileSync(path.join(root, "strix_runs/akun-uji.txt"), "utf8").split(/\r?\n/)
  .map((line) => line.match(/^(\w+)(?: \((\w+)\))?: (\S+) \/ (\S+)$/))
  .filter((m): m is RegExpMatchArray => !!m)
  .map(([, role, opd, email, password]) => ({ role, opd, email, password }));
const byEmail = (part: string) => accounts.find((a) => a.email.includes(part))!;

const pairOf = (c: string): [string, string] => [c.slice(0, c.indexOf("=")), c.slice(c.indexOf("=") + 1)];
const cookieHeader = (res: Response, prev = "") => {
  const jar = new Map(prev.split("; ").filter(Boolean).map(pairOf));
  for (const c of res.headers.getSetCookie()) jar.set(...pairOf(c.split(";")[0]));
  return [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
};

async function login(email: string, password: string, callbackUrl = `${BASE}/cms`) {
  const csrf = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = (await csrf.json()) as { csrfToken: string };
  let cookie = cookieHeader(csrf);
  const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    redirect: "manual",
    headers: { "content-type": "application/x-www-form-urlencoded", cookie, origin: BASE },
    body: new URLSearchParams({ email, password, csrfToken, callbackUrl }),
  });
  cookie = cookieHeader(res, cookie);
  return { cookie, location: res.headers.get("location") ?? "", ok: /session-token=/.test(cookie) };
}

const get = (url: string, cookie?: string) =>
  fetch(`${BASE}${url}`, { redirect: "manual", headers: cookie ? { cookie } : {} });

/** Ditolak = dialihkan ke login/ganti sandi/beranda, 401/403/404. */
const denied = (res: Response) => {
  const loc = res.headers.get("location") ?? "";
  return [401, 403, 404].includes(res.status) || (res.status >= 300 && res.status < 400 && !/\/cms(\/|$)/.test(new URL(loc, BASE).pathname));
};

// ---- daftar rute & server action dari build -------------------------------------------------------------------
const distDir = path.join(root, process.env.NEXT_DIST_DIR ?? ".next");
const toRoute = (worker: string) =>
  "/" + worker.replace(/^(app)?\//, "").replace(/(^|\/)page$/, "").split("/")
    .filter((s) => !/^\(.*\)$/.test(s))
    .map((s) => (s.startsWith("[") ? (s === "[modul]" ? "x" : NIL) : s))
    .join("/");

const pages = (() => {
  const manifest = JSON.parse(fs.readFileSync(path.join(distDir, "server/app-paths-manifest.json"), "utf8")) as Record<string, string>;
  return [...new Set(Object.keys(manifest).filter((k) => k.endsWith("/page")).map(toRoute))].map((r) => r.replace(/\/$/, "") || "/");
})();
const cmsPages = pages.filter((p) => p.startsWith("/cms"));

type ActionEntry = { workers: Record<string, unknown>; exportedName?: string; filename?: string };
const actions = (() => {
  const manifest = JSON.parse(fs.readFileSync(path.join(distDir, "server/server-reference-manifest.json"), "utf8")) as { node: Record<string, ActionEntry> };
  return Object.entries(manifest.node).map(([id, a]) => {
    const worker = Object.keys(a.workers).find((w) => w.endsWith("/page")) ?? Object.keys(a.workers)[0];
    return { id, name: `${a.filename ?? worker}#${a.exportedName ?? id.slice(0, 8)}`, route: toRoute(worker) };
  });
})();

async function callAction(action: (typeof actions)[number], cookie?: string, origin = BASE) {
  const res = await fetch(`${BASE}${action.route}`, {
    method: "POST",
    redirect: "manual",
    headers: { "next-action": action.id, "content-type": "text/plain;charset=UTF-8", accept: "text/x-component", origin, ...(cookie ? { cookie } : {}) },
    body: "[]",
  });
  const body = await res.text();
  const redirect = res.headers.get("x-action-redirect") ?? res.headers.get("location") ?? "";
  return { status: res.status, body, redirect };
}

const db = new pg.Client({ connectionString: DB_URL, ssl: false });
await db.connect();

try {
  // ---- 1. tanpa login -----------------------------------------------------------------------------------------
  for (const p of cmsPages) {
    const res = await get(p);
    record("Anonim", `GET ${p}`, denied(res) ? "PASS" : "FAIL", `${res.status} ${res.headers.get("location") ?? ""}`);
  }
  for (const p of ["aplikasi", "data", "gap", "infrastruktur", "keamanan", "layanan", "peta-rencana", "proses-bisnis"]) {
    const res = await get(`/api/export/${p}`);
    record("Anonim", `GET /api/export/${p}`, denied(res) ? "PASS" : "FAIL", String(res.status));
  }
  for (const a of actions) {
    const r = await callAction(a);
    const rejected = /\/login|\/akun\/sandi/.test(r.redirect) || /Sesi berakhir|masuk kembali/i.test(r.body) || [401, 403, 404].includes(r.status) || (r.status >= 300 && r.status < 400);
    const executed = /"ok":true/.test(r.body);
    record("Anonim", `action ${a.name}`, executed ? "FAIL" : rejected ? "PASS" : "REVIEW", `${r.status} ${r.redirect}`.trim());
  }

  // ---- 2. login per peran -------------------------------------------------------------------------------------
  for (const acc of accounts) {
    const r = await login(acc.email, acc.password);
    acc.cookie = r.cookie;
    record("Login", acc.email, r.ok ? "PASS" : "FAIL", r.ok ? "" : `gagal masuk (${r.location})`);
  }
  const opA = byEmail("operator.a");
  const opB = byEmail("operator.b");
  const pimpinan = byEmail("pimpinan");

  // ---- 3. halaman Pengaturan (hanya Superadmin / pengelola akun) ----------------------------------------------
  for (const acc of [opA, pimpinan]) {
    for (const p of cmsPages.filter((x) => x.startsWith("/cms/pengaturan"))) {
      const res = await get(p, acc.cookie);
      record(`Hak akses ${acc.role}`, `GET ${p}`, denied(res) ? "PASS" : "REVIEW", `${res.status}${res.status === 200 ? " (pastikan memang boleh dilihat peran ini)" : ""}`);
    }
  }

  // ---- 4. sapu server action dengan peran rendah: aksi Pengaturan tidak boleh berhasil -----------------------
  for (const acc of [opA, pimpinan]) {
    for (const a of actions) {
      const r = await callAction(a, acc.cookie);
      if (!/"ok":true/.test(r.body)) continue;
      const sensitive = /pengaturan|pengguna|hak-akses/.test(a.name + a.route);
      record(`Action ${acc.role}`, a.name, sensitive ? "FAIL" : "REVIEW", "berhasil tanpa argumen; pastikan memang hak peran ini");
    }
  }

  // ---- 5. IDOR antar-OPD: operator A membuka rekaman milik OPD operator B -------------------------------------
  const tables: Record<string, string> = {
    aplikasi: "applications", data: "datasets", infrastruktur: "infrastructures", keamanan: "security_activities",
    layanan: "services", "peta-rencana": "roadmap_items", "proses-bisnis": "process_businesses",
  };
  for (const [modul, table] of Object.entries(tables)) {
    const { rows } = await db.query(
      `select t.id from ${table} t join opd o on o.id = t.opd_id where o.code = $1 limit 1`,
      [opB.opd],
    ).catch(() => ({ rows: [] as { id: string }[] }));
    if (!rows[0]) {
      record("IDOR", `/cms/${modul}/[id] milik ${opB.opd}`, "REVIEW", "tidak ada rekaman OPD lain di database uji; tidak teruji");
      continue;
    }
    const res = await get(`/cms/${modul}/${rows[0].id}`, opA.cookie);
    record("IDOR", `operator ${opA.opd} → /cms/${modul}/<${opB.opd}>`, denied(res) ? "PASS" : "FAIL", String(res.status));
  }

  // ---- 6. CSRF: server action dari origin lain ditolak --------------------------------------------------------
  const sample = actions.find((a) => a.route.startsWith("/cms"));
  if (sample) {
    const r = await callAction(sample, opA.cookie, "https://penyerang.example");
    record("CSRF", `action dengan Origin asing (${sample.name})`, /"ok":true/.test(r.body) || (r.status === 200 && !/error/i.test(r.body)) ? "FAIL" : "PASS", String(r.status));
  }

  // ---- 7. pencabutan sesi setelah sandi diganti/di-reset ------------------------------------------------------
  await db.query("update users set password_changed_at = now() + interval '1 second' where email = $1", [opB.email]);
  {
    const res = await get("/cms", opB.cookie);
    record("Sesi", "sesi lama dicabut setelah sandi diganti", denied(res) ? "PASS" : "FAIL", `${res.status} ${res.headers.get("location") ?? ""}`);
  }
  await db.query("update users set password_changed_at = null where email = $1", [opB.email]);

  // ---- 8. akun nonaktif kehilangan sesi -----------------------------------------------------------------------
  const fresh = await login(opB.email, opB.password);
  await db.query("update users set active = false where email = $1", [opB.email]);
  {
    const res = await get("/cms", fresh.cookie);
    record("Sesi", "akun dinonaktifkan langsung keluar", denied(res) ? "PASS" : "FAIL", String(res.status));
  }
  await db.query("update users set active = true where email = $1", [opB.email]);

  // ---- 9. wajib ganti sandi sementara -------------------------------------------------------------------------
  await db.query("update users set must_change_password = true where email = $1", [pimpinan.email]);
  {
    const res = await get("/cms", pimpinan.cookie);
    const loc = res.headers.get("location") ?? "";
    record("Sandi sementara", "CMS terkunci sampai sandi diganti", /\/akun\/sandi/.test(loc) || denied(res) ? "PASS" : "FAIL", `${res.status} ${loc}`);
    const cmsAction = actions.find((a) => a.route.startsWith("/cms") && !/akun/.test(a.name));
    if (cmsAction) {
      const r = await callAction(cmsAction, pimpinan.cookie);
      record("Sandi sementara", `server action terkunci (${cmsAction.name})`, /"ok":true/.test(r.body) ? "FAIL" : "PASS", `${r.status} ${r.redirect}`);
    }
  }
  await db.query("update users set must_change_password = false where email = $1", [pimpinan.email]);

  // ---- 10. open redirect lewat callbackUrl --------------------------------------------------------------------
  {
    const r = await login(opA.email, opA.password, "https://penyerang.example/curi");
    record("Open redirect", "callbackUrl ke domain lain setelah login", /penyerang\.example/.test(r.location) ? "FAIL" : "PASS", r.location);
    const res = await get("/login?callbackUrl=https%3A%2F%2Fpenyerang.example", opA.cookie);
    const loc = res.headers.get("location") ?? "";
    record("Open redirect", "/login?callbackUrl=… saat sudah masuk", /penyerang\.example/.test(loc) ? "FAIL" : "PASS", `${res.status} ${loc}`);
  }

  // ---- 11. header keamanan ------------------------------------------------------------------------------------
  {
    const res = await get("/");
    for (const h of ["content-security-policy", "x-content-type-options", "referrer-policy", "permissions-policy"]) {
      record("Header", h, res.headers.get(h) ? "PASS" : "FAIL", res.headers.get(h)?.slice(0, 80) ?? "tidak ada");
    }
    const csp = res.headers.get("content-security-policy") ?? "";
    record("Header", "CSP frame-ancestors", /frame-ancestors 'none'|frame-ancestors 'self'/.test(csp) || !!res.headers.get("x-frame-options") ? "PASS" : "FAIL");
    record("Header", "x-powered-by disembunyikan", res.headers.get("x-powered-by") ? "FAIL" : "PASS");
  }

  // ---- 12. rate limit login (terakhir: mengunci akun uji validator data 15 menit) -----------------------------
  {
    const target = byEmail("validator.data");
    let locked = false;
    for (let i = 0; i < 7 && !locked; i++) {
      const r = await login(target.email, "salah-" + i);
      locked = /code=locked|error=.*locked/.test(r.location);
    }
    const r = await login(target.email, target.password);
    record("Brute force", "akun terkunci setelah 5 sandi salah", locked && !r.ok ? "PASS" : "FAIL", locked ? "terkunci; sandi benar pun ditolak" : "tidak terkunci");
  }
} finally {
  await db.end();
}

// ---- laporan --------------------------------------------------------------------------------------------------
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "authz-probe.json"), JSON.stringify(results, null, 2));
const count = (s: Result["status"]) => results.filter((r) => r.status === s).length;
const md = [
  "# Uji otorisasi (authz-probe)",
  "",
  `Target: ${BASE} · ${new Date().toISOString()} · ${actions.length} server action, ${cmsPages.length} halaman CMS`,
  "",
  `**FAIL ${count("FAIL")} · REVIEW ${count("REVIEW")} · PASS ${count("PASS")}**`,
  "",
  "| Status | Area | Pemeriksaan | Detail |",
  "|---|---|---|---|",
  ...[...results].sort((a, b) => ["FAIL", "REVIEW", "PASS"].indexOf(a.status) - ["FAIL", "REVIEW", "PASS"].indexOf(b.status))
    .map((r) => `| ${r.status} | ${r.area} | ${r.check.replace(/\|/g, "\\|")} | ${r.detail.replace(/\|/g, "\\|")} |`),
].join("\n");
fs.writeFileSync(path.join(outDir, "authz-probe.md"), md + "\n");
console.log(`\nFAIL ${count("FAIL")} · REVIEW ${count("REVIEW")} · PASS ${count("PASS")} → ${path.join(outDir, "authz-probe.md")}`);
process.exitCode = count("FAIL") ? 1 : 0;
