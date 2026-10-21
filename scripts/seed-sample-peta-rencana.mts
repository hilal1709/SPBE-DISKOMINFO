// Isi database dengan kegiatan & indikator contoh Peta Rencana (sama dengan dashboard publik /peta-rencana), atau hapus.
// Jalankan: pnpm seed:peta-rencana          → hapus contoh lama lalu isi ulang
//           pnpm seed:peta-rencana --hapus  → hapus semua contoh
import { readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import { allRencana } from "@/lib/peta-rencana/generate";

const root = join(import.meta.dirname, "..");
const env = Object.fromEntries(
  readFileSync(join(root, ".env.local"), "utf8")
    .split(/\r?\n/).filter((line) => line && !line.startsWith("#")).map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1)]),
);
if (!env.DATABASE_URL) throw new Error("DATABASE_URL tidak tersedia di .env.local");

const client = new pg.Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();

try {
  await client.query("begin");
  const removed = await client.query("delete from roadmap_items where is_sample");
  const removedInd = await client.query("delete from roadmap_indicators where is_sample");
  console.log(`Contoh lama dihapus: ${removed.rowCount} kegiatan, ${removedInd.rowCount} indikator`);

  if (!process.argv.includes("--hapus")) {
    const idMap = async (sql: string) => new Map((await client.query(sql)).rows.map((r) => [r.key as string, r.id as string]));
    const opd = await idMap("select code as key, id from opd");
    const periods = await idMap("select name as key, id from architecture_periods");
    const { rows, indicators } = allRencana();
    const missing = [...new Set(rows.map((r) => r.period))].filter((p) => !periods.has(p));
    if (missing.length) throw new Error(`Periode belum terdaftar: ${missing.join(", ")}. Tambahkan dulu di CMS › Periode Arsitektur.`);
    const col = <K extends keyof (typeof rows)[number]>(k: K) => rows.map((r) => r[k]);
    await client.query(
      `insert into roadmap_items (code, name, year, sasaran, inisiatif, muatan, program, target, jumlah, satuan, status, realisasi, evaluation_note, source, source_ref, opd_id, period_id, is_sample)
       select t.*, true
       from unnest($1::text[], $2::text[], $3::int[], $4::text[], $5::text[], $6::text[], $7::text[], $8::text[], $9::numeric[], $10::text[], $11::text[], $12::text[], $13::text[], $14::text[], $15::text[], $16::uuid[], $17::uuid[])
         as t(code, name, year, sasaran, inisiatif, muatan, program, target, jumlah, satuan, status, realisasi, evaluation_note, source, source_ref, opd_id, period_id)
       on conflict (code, period_id) do nothing`,
      [
        col("id"), col("name"), col("year"), col("sasaran"), col("inisiatif"), col("muatan"), col("program"), col("target"), col("jumlah"), col("satuan"),
        col("status"), col("realisasi"), col("evaluasi"), col("source"), col("sourceRef"), rows.map((r) => opd.get(r.opd)), rows.map((r) => periods.get(r.period)),
      ],
    );
    // Tautan pengalihan: salinan menunjuk kegiatan asalnya di periode yang sama.
    await client.query(
      `update roadmap_items r set deferred_from = src.id from roadmap_items src
       where r.is_sample and r.source = 'usulan_tertunda' and src.code = r.source_ref and src.period_id = r.period_id`,
    );
    const inds = indicators.filter((i) => periods.has(i.period));
    await client.query(
      `insert into roadmap_indicators (period_id, sasaran, inisiatif, indikator, targets, is_sample)
       select t.*, true from unnest($1::uuid[], $2::text[], $3::text[], $4::text[], $5::jsonb[]) as t(period_id, sasaran, inisiatif, indikator, targets)
       on conflict (period_id, sasaran, indikator) do nothing`,
      [inds.map((i) => periods.get(i.period)), inds.map((i) => i.sasaran), inds.map((i) => i.inisiatif), inds.map((i) => i.indikator), inds.map((i) => JSON.stringify(i.targets))],
    );
    const { rows: [{ n, m }] } = await client.query("select (select count(*) from roadmap_items where is_sample)::int as n, (select count(*) from roadmap_indicators where is_sample)::int as m");
    console.log(`Contoh dimasukkan: ${n} kegiatan, ${m} indikator.`);
  }
  await client.query("commit");
} catch (error) {
  await client.query("rollback");
  throw error;
} finally {
  await client.end();
}
