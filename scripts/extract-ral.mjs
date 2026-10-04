// Referensi RAL (Level 1–5) dari template analis "Domain Arsitektur Layanan.xlsx".
//
//   node scripts/extract-ral.mjs                        → tulis lib/layanan/ral-reference.json
//   node scripts/extract-ral.mjs --template x.xlsx      → pakai template lain (mis. kiriman analis)
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSX from "xlsx";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const i = process.argv.indexOf("--template");
const templatePath = resolve(i > -1 ? process.argv[i + 1] : join(root, "public/templates/layanan.xlsx"));
const book = XLSX.read(readFileSync(templatePath));

const small = new Set(["dan", "atau", "di", "ke", "dari", "yang", "untuk", "serta", "dalam", "pada"]);
const acronym = /^(SDM|ASN|UMKM|TIK|SPBE|APBN|APBD|BUMN|BUMD|HAM|NKRI|TNI|POLRI|IPTEK|PNS|SNI|BPJS)$/;
/** Salah ketik di template sumber. */
const fix = (text) => text.replace(/PENGE4OLAAN/gi, "Pengelolaan");
const title = (text) =>
  text
    .toLowerCase()
    .split(/\s+/)
    .map((w, i) => (acronym.test(w.toUpperCase()) ? w.toUpperCase() : i > 0 && small.has(w) ? w : w.replace(/^\p{L}/u, (c) => c.toUpperCase())))
    .join(" ");

const nodes = [];
for (const level of [1, 2, 3, 4, 5]) {
  const sheet = book.Sheets[`RAL Level ${level}`];
  if (!sheet) continue;
  for (const [cell] of XLSX.utils.sheet_to_json(sheet, { header: 1 })) {
    const match = String(cell ?? "").trim().match(/^(RAL(?:\.\d{2}){1,5})\s+(.+)$/i);
    if (!match) continue;
    const code = match[1].toUpperCase();
    if (code.split(".").length - 1 !== level) continue;
    nodes.push({ code, name: title(fix(match[2].trim())), level, ...(level > 1 && { parent: code.slice(0, code.lastIndexOf(".")) }) });
  }
}

const orphans = nodes.filter((n) => n.parent && !nodes.some((p) => p.code === n.parent));
if (orphans.length) throw new Error(`Induk tidak ditemukan: ${orphans.map((n) => n.code).join(", ")}`);
writeFileSync(join(root, "lib/layanan/ral-reference.json"), JSON.stringify(nodes));
console.log(`RAL L1/L2/L3/L4/L5: ${[1, 2, 3, 4, 5].map((l) => nodes.filter((n) => n.level === l).length).join("/")}`);
