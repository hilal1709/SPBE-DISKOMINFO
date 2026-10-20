// Referensi RAI (Level 1–2) dari template analis "Domain Arsitektur Infrastruktur - *.xlsx".
//
//   node scripts/extract-rai.mjs                        → tulis lib/infrastruktur/rai-reference.json
//   node scripts/extract-rai.mjs --template x.xlsx      → pakai template lain (mis. kiriman analis)
//   node scripts/extract-rai.mjs --sql                  → juga cetak INSERT untuk migrasi
//
// Sheet referensi di template bernama "RAL Level 1/2" padahal isinya RAI. Template memberi kode ganda RAI.02.01
// untuk Jaringan Intra Pemerintah dan Sistem Penghubung Layanan Pemerintah; kode ganda berikutnya dinomori ulang
// (SPLP → RAI.02.02) sesuai urutan di sheet.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSX from "xlsx";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const i = process.argv.indexOf("--template");
const templatePath = resolve(i > -1 ? process.argv[i + 1] : join(root, "public/templates/infrastruktur/Domain Arsitektur Infrastruktur - Fasilitas Komputasi.xlsx"));
const book = XLSX.read(readFileSync(templatePath));

const small = new Set(["dan", "atau", "di", "ke", "dari", "yang", "untuk", "serta", "pada", "per"]);
const title = (text) =>
  text
    .toLowerCase()
    .split(/\s+/)
    .map((w, i) => (i > 0 && small.has(w) ? w : w.replace(/^\p{L}/u, (c) => c.toUpperCase())))
    .join(" ");

const nodes = new Map();
for (const name of book.SheetNames.filter((n) => /^R[A-Z]{2} Level \d$/.test(n))) {
  for (const [cell] of XLSX.utils.sheet_to_json(book.Sheets[name], { header: 1 })) {
    const match = String(cell ?? "").trim().match(/^(RAI(?:\.\d{2}){1,5})\s+(.+)$/i);
    if (!match) continue;
    let code = match[1].toUpperCase();
    const level = code.split(".").length - 1;
    if (level > 3) continue;
    const parent = level > 1 ? code.slice(0, code.lastIndexOf(".")) : undefined;
    // Kode ganda: pakai nomor berikutnya yang belum terpakai di bawah induk yang sama.
    while (nodes.has(code)) {
      const n = Number(code.slice(-2)) + 1;
      code = `${code.slice(0, -2)}${String(n).padStart(2, "0")}`;
    }
    nodes.set(code, { code, name: title(match[2].trim()), level, ...(parent && { parent }) });
  }
}

const list = [...nodes.values()].sort((a, b) => a.code.localeCompare(b.code, "en", { numeric: true }));
const orphans = list.filter((n) => n.parent && !nodes.has(n.parent));
if (orphans.length) throw new Error(`Induk tidak ditemukan: ${orphans.map((n) => n.code).join(", ")}`);
writeFileSync(join(root, "lib/infrastruktur/rai-reference.json"), JSON.stringify(list));
console.log(`RAI: ${list.length} node (${[1, 2, 3].map((l) => `L${l} ${list.filter((n) => n.level === l).length}`).join(", ")})`);

if (process.argv.includes("--sql")) {
  const q = (s) => `'${s.replace(/'/g, "''")}'`;
  for (const level of [1, 2, 3]) {
    const rows = list.filter((n) => n.level === level);
    if (!rows.length) continue;
    console.log(`\nINSERT INTO rai_references (code, name, level, parent_id, version_id)
SELECT v.code, v.name, ${level}, p.id, (SELECT id FROM rai_versions ORDER BY created_at LIMIT 1) FROM (VALUES
${rows.map((n) => `(${q(n.code)},${q(n.name)},${n.parent ? q(n.parent) : "NULL"})`).join(",\n")}
) AS v(code, name, parent)
LEFT JOIN rai_references p ON p.code = v.parent AND p.version_id = (SELECT id FROM rai_versions ORDER BY created_at LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM rai_references r WHERE r.code = v.code);`);
  }
}
