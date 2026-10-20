// Referensi RAA (Level 1–2) dari template analis "Domain Arsitektur Aplikasi.xlsx".
//
//   node scripts/extract-raa.mjs                        → tulis lib/aplikasi/raa-reference.json
//   node scripts/extract-raa.mjs --template x.xlsx      → pakai template lain (mis. kiriman analis)
//   node scripts/extract-raa.mjs --sql                  → juga cetak INSERT untuk migrasi
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSX from "xlsx";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const i = process.argv.indexOf("--template");
const templatePath = resolve(i > -1 ? process.argv[i + 1] : join(root, "public/templates/aplikasi.xlsx"));
const book = XLSX.read(readFileSync(templatePath));

const small = new Set(["dan", "atau", "di", "ke", "dari", "yang", "untuk", "serta", "pada", "per"]);
const title = (text) =>
  text
    .toLowerCase()
    .split(/\s+/)
    .map((w, i) => (i > 0 && small.has(w) ? w : w.replace(/^\p{L}/u, (c) => c.toUpperCase())))
    .join(" ");

// Level ditentukan dari kode; sheet "RAA Level 3" di template masih kosong.
const nodes = new Map();
for (const name of book.SheetNames.filter((n) => /^RAA Level \d$/.test(n))) {
  for (const [cell] of XLSX.utils.sheet_to_json(book.Sheets[name], { header: 1 })) {
    const match = String(cell ?? "").trim().match(/^(RAA(?:\.\d{2}){1,5})\s+(.+)$/i);
    if (!match) continue;
    const code = match[1].toUpperCase();
    const level = code.split(".").length - 1;
    if (level > 3 || nodes.has(code)) continue;
    nodes.set(code, { code, name: title(match[2].trim()), level, ...(level > 1 && { parent: code.slice(0, code.lastIndexOf(".")) }) });
  }
}

const list = [...nodes.values()].sort((a, b) => a.code.localeCompare(b.code, "en", { numeric: true }));
const orphans = list.filter((n) => n.parent && !nodes.has(n.parent));
if (orphans.length) throw new Error(`Induk tidak ditemukan: ${orphans.map((n) => n.code).join(", ")}`);
writeFileSync(join(root, "lib/aplikasi/raa-reference.json"), JSON.stringify(list));
console.log(`RAA L1/L2/L3: ${[1, 2, 3].map((l) => list.filter((n) => n.level === l).length).join("/")}`);

// --sql: cetak INSERT per level untuk migrasi (versi RAA pertama).
if (process.argv.includes("--sql")) {
  const q = (s) => `'${s.replace(/'/g, "''")}'`;
  const version = "(SELECT id FROM raa_versions ORDER BY created_at LIMIT 1)";
  for (const level of [1, 2, 3]) {
    const values = list.filter((n) => n.level === level).map((n) => `(${q(n.code)},${q(n.name)},${n.parent ? q(n.parent) : "NULL"})`);
    if (!values.length) continue;
    console.log(`INSERT INTO raa_references (code, name, level, parent_id, version_id)
SELECT v.code, v.name, ${level}, p.id, ${version} FROM (VALUES
${values.join(",\n")}
) AS v(code, name, parent)
LEFT JOIN raa_references p ON p.code = v.parent AND p.version_id = ${version}
WHERE NOT EXISTS (SELECT 1 FROM raa_references r WHERE r.code = v.code);
`);
  }
}
