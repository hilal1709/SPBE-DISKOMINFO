// Referensi RAB resmi (Level 1–5) dari template "Domain Arsitektur Proses Bisnis.xlsx".
//
//   node scripts/extract-reference.mjs                                → tulis lib/probis/rab-reference.json (cadangan bawaan)
//   node scripts/extract-reference.mjs --db --versi "Perpres 2027"    → buat VERSI DRAF baru di database dari template
//   node scripts/extract-reference.mjs --template x.xlsx …            → pakai template lain (mis. kiriman analis)
//
// Referensi yang berlaku dikelola di CMS › Pengaturan › Referensi RAB (berversi per periode).
// Versi draf hasil skrip ini dicocokkan ke versi terbit terbaru lewat kode (origin_id), lalu
// diperiksa, disunting bila perlu, dan diterbitkan dari CMS. Versi yang sudah terbit tidak disentuh.
import { readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSX from "xlsx";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const templatePath = resolve(arg("--template") ?? join(root, "public/templates/proses-bisnis.xlsx"));
const book = XLSX.read(readFileSync(templatePath));

const small = new Set(["dan", "atau", "di", "ke", "dari", "yang", "untuk", "serta", "dalam", "pada"]);
const acronym = /^(PBK|SRG|PLK|WNI|SDM|ASN|UMKM|IKM|TIK|SPBE|APBN|APBD|KUR|BUMN|BUMD|HAM|PNBP|NKRI|TNI|POLRI|IPTEK|K3|HKI|ODGJ|KB|PAUD|PNS|LKPP|SNI|BPJS|RTH|B3|PDRB)$/;
const title = (text) =>
  text
    .toLowerCase()
    .split(/\s+/)
    .map((w, i) => (acronym.test(w.toUpperCase()) ? w.toUpperCase() : i > 0 && small.has(w) ? w : w.replace(/^\p{L}/u, (c) => c.toUpperCase())))
    .join(" ");

const nodes = [];
const skipped = [];
for (const level of [1, 2, 3, 4, 5]) {
  const sheet = book.Sheets[`RAB Level ${level}`];
  if (!sheet) continue;
  for (const [cell] of XLSX.utils.sheet_to_json(sheet, { header: 1 })) {
    const raw = String(cell ?? "").trim();
    if (!raw) continue;
    const match = raw.match(/^(RAB(?:\.\d{2}){1,5})\s+(.+)$/i);
    // Baris contoh format seperti "RAB.xx.xx.xx.xx.nn" dilewati.
    if (!match) {
      if (!/x/i.test(raw)) skipped.push(`L${level}: ${raw}`);
      continue;
    }
    const code = match[1].toUpperCase();
    const depth = code.split(".").length - 1;
    if (depth !== level) {
      skipped.push(`L${level}: ${code} (kode level ${depth})`);
      continue;
    }
    nodes.push({ code, name: title(match[2].trim()), level, ...(level > 1 && { parent: code.slice(0, code.lastIndexOf(".")) }) });
  }
}

const orphans = nodes.filter((n) => n.parent && !nodes.some((p) => p.code === n.parent));
if (orphans.length) throw new Error(`Induk tidak ditemukan: ${orphans.map((n) => n.code).join(", ")}`);
writeFileSync(join(root, "lib/probis/rab-reference.json"), JSON.stringify(nodes));
const counts = [1, 2, 3, 4, 5].map((l) => nodes.filter((n) => n.level === l).length);
console.log(`RAB L1/L2/L3/L4/L5: ${counts.join("/")}`);
if (skipped.length) console.warn(`Dilewati (${skipped.length}):\n  ${skipped.join("\n  ")}`);

if (process.argv.includes("--db")) {
  const versionName = arg("--versi");
  if (!versionName) throw new Error('Sertakan nama versi, mis. --versi "Perpres 2027"');
  const pg = (await import("pg")).default;
  const env = Object.fromEntries(
    readFileSync(join(root, ".env.local"), "utf8")
      .split(/\r?\n/).filter((l) => l && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
  );
  const client = new pg.Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query("begin");
    const base = (await client.query("select id from rab_versions where status = 'published' order by published_at desc nulls last limit 1")).rows[0]?.id ?? null;
    const { rows } = await client.query(
      "insert into rab_versions (name, note, status, based_on) values ($1, $2, 'draft', $3) returning id",
      [versionName, `Dari template ${basename(templatePath)}`, base],
    );
    const versionId = rows[0].id;
    for (const level of [1, 2, 3, 4, 5]) {
      const list = nodes.filter((n) => n.level === level);
      if (!list.length) continue;
      await client.query(
        `insert into rab_references (code, name, level, parent_id, version_id, origin_id)
         select v.code, v.name, $4, p.id, $5, o.id from unnest($1::text[], $2::text[], $3::text[]) as v(code, name, parent)
         left join rab_references p on p.code = v.parent and p.version_id = $5
         left join rab_references o on o.code = v.code and o.version_id = $6`,
        [list.map((n) => n.code), list.map((n) => n.name), list.map((n) => n.parent ?? null), level, versionId, base],
      );
    }
    await client.query("insert into rab_changes (version_id, action, after, actor_name) values ($1, 'buat_versi', $2, 'Skrip referensi')", [versionId, JSON.stringify({ nama: versionName })]);
    await client.query("commit");
    console.log(`Versi draf “${versionName}” dibuat. Periksa dan terbitkan di CMS › Pengaturan › Referensi RAB.`);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}
