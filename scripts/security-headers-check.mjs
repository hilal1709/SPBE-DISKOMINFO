// Cek header keamanan seperti securityheaders.com (pasif, hanya GET/HEAD).
// Jalankan: node scripts/security-headers-check.mjs [url]   (default: produksi)
const target = process.argv[2] ?? "https://spbe-diskominfo.vercel.app";
const paths = ["/", "/login", "/cms", "/keamanan", "/api/export/keamanan", "/design-system"];

const required = {
  "content-security-policy": (v) => /default-src/.test(v) && /frame-ancestors 'none'/.test(v) && /object-src 'none'/.test(v),
  "strict-transport-security": (v) => /max-age=\d{8,}/.test(v),
  "x-frame-options": (v) => /deny|sameorigin/i.test(v),
  "x-content-type-options": (v) => v.toLowerCase() === "nosniff",
  "referrer-policy": (v) => /strict-origin|no-referrer|same-origin/.test(v),
  "permissions-policy": (v) => /camera=\(\)/.test(v),
  "cross-origin-opener-policy": (v) => v === "same-origin",
};
const forbidden = ["x-powered-by", "server-timing"];

let failed = 0;
for (const path of paths) {
  const res = await fetch(target + path, { redirect: "manual" });
  const problems = [];
  for (const [name, ok] of Object.entries(required)) {
    const value = res.headers.get(name);
    if (!value) problems.push(`hilang: ${name}`);
    else if (!ok(value)) problems.push(`lemah: ${name}: ${value}`);
  }
  for (const name of forbidden) if (res.headers.has(name)) problems.push(`bocor: ${name}: ${res.headers.get(name)}`);
  failed += problems.length;
  console.log(`${problems.length ? "✗" : "✓"} ${res.status} ${path}${problems.map((p) => `\n    ${p}`).join("")}`);
}
console.log(failed ? `\n${failed} masalah header.` : "\nSemua header keamanan lengkap.");
process.exit(failed ? 1 : 0);
