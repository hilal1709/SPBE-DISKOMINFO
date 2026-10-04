// Referensi RAD (Level 1–3) dari template analis "Domain Arsitektur Data dan Informasi.xlsx".
//
//   node scripts/extract-rad.mjs                        → tulis lib/data/rad-reference.json
//   node scripts/extract-rad.mjs --template x.xlsx      → pakai template lain (mis. kiriman analis)
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSX from "xlsx";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const i = process.argv.indexOf("--template");
const templatePath = resolve(i > -1 ? process.argv[i + 1] : join(root, "public/templates/data.xlsx"));
const book = XLSX.read(readFileSync(templatePath));

const small = new Set(["dan", "atau", "di", "ke", "dari", "yang", "untuk", "serta", "pada", "per"]);
const acronym = /^(SDM|ASN|UMKM|TIK|SPBE|APBN|APBD|BUMN|BUMD|HAM|NKRI|TNI|POLRI|IPTEK|PNS|SNI|BPJS|BTS|KAB\/KOTA)$/;
const title = (text) =>
  text
    .toLowerCase()
    .split(/\s+/)
    .map((w, i) => (acronym.test(w.toUpperCase()) ? w.toUpperCase() : i > 0 && small.has(w) ? w : w.replace(/^\p{L}/u, (c) => c.toUpperCase())))
    .join(" ");

// Level ditentukan dari kode, bukan nama sheet: sheet "RAD Level 2" memuat beberapa baris L3.
const nodes = new Map();
for (const name of book.SheetNames.filter((n) => /^RAD Level \d$/.test(n))) {
  for (const [cell] of XLSX.utils.sheet_to_json(book.Sheets[name], { header: 1 })) {
    const match = String(cell ?? "").trim().match(/^(RAD(?:\.\d{2}){1,5})\s+(.+)$/i);
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
writeFileSync(join(root, "lib/data/rad-reference.json"), JSON.stringify(list));
console.log(`RAD L1/L2/L3: ${[1, 2, 3].map((l) => list.filter((n) => n.level === l).length).join("/")}`);
