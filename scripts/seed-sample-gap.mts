// Isi Gap Analysis contoh: pindai kesenjangan pada data contoh tiap periode, lalu tautkan sebagian ke kegiatan
// Peta Rencana contoh bersumber gap agar alur gap → usulan → terlaksana terlihat.
// Jalankan: pnpm seed:gap          → hapus contoh lama lalu pindai ulang
//           pnpm seed:gap --hapus  → hapus semua temuan contoh
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
for (const line of readFileSync(join(root, ".env.local"), "utf8").split(/\r?\n/)) {
  if (line && !line.startsWith("#") && line.includes("=")) process.env[line.slice(0, line.indexOf("="))] ??= line.slice(line.indexOf("=") + 1);
}
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL tidak tersedia di .env.local");

const { getDb } = await import("@/lib/db");
const { scanGaps } = await import("@/lib/gap/cms-repo");
const db = getDb()!;

const removed = await db.query("delete from gap_analyses where is_sample");
console.log(`Temuan contoh lama dihapus: ${removed.rowCount}`);

if (!process.argv.includes("--hapus")) {
  const { rows: periods } = await db.query("select name from architecture_periods order by start_year");
  for (const { name } of periods) {
    const result = await scanGaps(name, null, { sample: true });
    console.log(`${name}: ${result.created} temuan`);
  }
  // Kegiatan contoh bersumber gap → pasangkan dengan temuan terbuka berdomain sama di periode yang sama.
  const { rows: items } = await db.query("select id, period_id, muatan, status from roadmap_items where is_sample and source = 'gap' order by year, code");
  let linked = 0;
  for (const item of items) {
    const { rows } = await db.query(
      "select id, code from gap_analyses where is_sample and status = 'terbuka' and period_id = $1 and domain = $2 order by case priority when 'tinggi' then 0 when 'sedang' then 1 else 2 end, code limit 1",
      [item.period_id, item.muatan],
    );
    if (!rows[0]) continue;
    await db.query("update gap_analyses set status = $2, roadmap_item_id = $3 where id = $1", [rows[0].id, item.status === "terlaksana" ? "ditindaklanjuti" : "diusulkan", item.id]);
    await db.query("update roadmap_items set source_ref = $2 where id = $1", [item.id, rows[0].code]);
    linked++;
  }
  console.log(`Ditautkan ke kegiatan Peta Rencana: ${linked}`);
  const { rows: stat } = await db.query("select rule, count(*)::int n from gap_analyses where is_sample group by 1 order by 2 desc");
  console.table(stat);
}
await db.end();
