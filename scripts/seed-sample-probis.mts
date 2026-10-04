// Isi database dengan data contoh probis (sama dengan dashboard publik), atau hapus.
// Jalankan: pnpm seed:contoh          → hapus contoh lama lalu isi ulang (status Tervalidasi)
//           pnpm seed:contoh --hapus  → hapus semua data contoh
import { readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import { allProbis } from "@/lib/probis/generate";

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
  const removed = await client.query("delete from process_businesses where is_sample");
  console.log(`Data contoh lama dihapus: ${removed.rowCount}`);

  if (!process.argv.includes("--hapus")) {
    const idMap = async (sql: string) => new Map((await client.query(sql)).rows.map((r) => [r.key as string, r.id as string]));
    const opd = await idMap("select code as key, id from opd");
    const periods = await idMap("select name as key, id from architecture_periods");
    // Kode RAB unik per versi: cari di versi RAB milik periode masing-masing.
    const rab = await idMap("select ap.name || '|' || r.code as key, r.id from rab_references r join architecture_periods ap on ap.rab_version_id = r.version_id where r.level = 3");

    const rows = allProbis();
    const missing = [...new Set(rows.map((r) => r.period))].filter((p) => !periods.has(p));
    if (missing.length) throw new Error(`Periode belum terdaftar: ${missing.join(", ")}. Tambahkan dulu di CMS › Periode Arsitektur.`);

    for (let i = 0; i < rows.length; i += 500) {
      const batch = rows.slice(i, i + 500);
      await client.query(
        `insert into process_businesses (code, name, description, opd_id, period_id, rab_id, strategic_goal, iku, probis_status, status, is_sample)
         select * from unnest($1::text[], $2::text[], $3::text[], $4::uuid[], $5::uuid[], $6::uuid[], $7::text[], $8::text[], $9::probis_status[])
           as t(code, name, description, opd_id, period_id, rab_id, strategic_goal, iku, probis_status),
           lateral (select 'approved'::submission_status, true) as fixed
         on conflict (code, period_id) do nothing`,
        [
          batch.map((r) => r.id),
          batch.map((r) => r.name),
          batch.map((r) => r.uraian),
          batch.map((r) => opd.get(r.pd)),
          batch.map((r) => periods.get(r.period)),
          batch.map((r) => rab.get(`${r.period}|${r.rab3}`)),
          batch.map((r) => r.sasaran),
          batch.map((r) => r.iku),
          batch.map((r) => r.status),
        ],
      );
    }
    await client.query(
      `insert into probis_reviews (process_business_id, actor_name, to_status, note)
       select id, 'Sistem', 'approved', 'Data contoh dari dokumen analis' from process_businesses where is_sample`,
    );
    const { rows: [{ n }] } = await client.query("select count(*)::int as n from process_businesses where is_sample");
    console.log(`Data contoh dimasukkan: ${n} probis (status Tervalidasi).`);
  }
  await client.query("commit");
} catch (error) {
  await client.query("rollback");
  throw error;
} finally {
  await client.end();
}
