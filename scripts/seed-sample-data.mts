// Isi database dengan data contoh Domain Data (sama dengan dashboard publik /data), atau hapus.
// Jalankan: pnpm seed:data          → hapus contoh lama lalu isi ulang (status Tervalidasi)
//           pnpm seed:data --hapus  → hapus semua data contoh
// Proses bisnis & layanan hanya ditautkan bila contohnya sudah ada (pnpm seed:contoh, pnpm seed:layanan).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import { allData } from "@/lib/data/generate";

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
  const removed = await client.query("delete from datasets where is_sample");
  console.log(`Data contoh lama dihapus: ${removed.rowCount}`);

  if (!process.argv.includes("--hapus")) {
    const idMap = async (sql: string) => new Map((await client.query(sql)).rows.map((r) => [r.key as string, r.id as string]));
    const opd = await idMap("select code as key, id from opd");
    const periods = await idMap("select name as key, id from architecture_periods");
    // Kode RAD unik per versi: cari di versi milik periode masing-masing (L3, atau L2 tanpa turunan).
    const rad = await idMap("select ap.name || '|' || r.code as key, r.id from rad_references r join architecture_periods ap on ap.rad_version_id = r.version_id where r.level in (2, 3)");
    const probis = await idMap("select ap.name || '|' || pb.code as key, pb.id from process_businesses pb join architecture_periods ap on ap.id = pb.period_id");
    const services = await idMap("select ap.name || '|' || s.code as key, s.id from services s join architecture_periods ap on ap.id = s.period_id");

    const rows = allData();
    const missing = [...new Set(rows.map((r) => r.period))].filter((p) => !periods.has(p));
    if (missing.length) throw new Error(`Periode belum terdaftar: ${missing.join(", ")}. Tambahkan dulu di CMS › Periode Arsitektur.`);

    for (let i = 0; i < rows.length; i += 500) {
      const batch = rows.slice(i, i + 500);
      await client.query(
        `insert into datasets (code, name, description, purpose, output_info, input_info, sifat, jenis, validitas, interoperable,
           opd_id, producer_opd_id, period_id, rad_id, status, approved_at, is_sample)
         select t.*, 'approved'::submission_status, now(), true
         from unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[], $7::text[], $8::text[], $9::text[], $10::boolean[],
                     $11::uuid[], $12::uuid[], $13::uuid[], $14::uuid[])
           as t(code, name, description, purpose, output_info, input_info, sifat, jenis, validitas, interoperable, opd_id, producer_opd_id, period_id, rad_id)
         on conflict (code, period_id) do nothing`,
        [
          batch.map((r) => r.id),
          batch.map((r) => r.name),
          batch.map((r) => r.uraian),
          batch.map((r) => r.tujuan),
          batch.map((r) => r.output),
          batch.map((r) => r.input),
          batch.map((r) => r.sifat),
          batch.map((r) => r.jenis),
          batch.map((r) => r.validitas),
          batch.map((r) => r.interoperabel),
          batch.map((r) => opd.get(r.wali)),
          batch.map((r) => (r.produsen !== r.wali ? (opd.get(r.produsen) ?? null) : null)),
          batch.map((r) => periods.get(r.period)),
          batch.map((r) => rad.get(`${r.period}|${r.rad3 ?? r.rad2}`)),
        ],
      );
    }

    const datasets = await idMap("select ap.name || '|' || d.code as key, d.id from datasets d join architecture_periods ap on ap.id = d.period_id where d.is_sample");
    const link = (pick: (r: (typeof rows)[number]) => { id: string }[], target: Map<string, string>) =>
      rows.flatMap((r) => pick(r).map((p) => [datasets.get(`${r.period}|${r.id}`), target.get(`${r.period}|${p.id}`)] as const)).filter(([d, t]) => d && t);
    const probisLinks = link((r) => r.probis, probis);
    const serviceLinks = link((r) => r.layanan, services);
    if (probisLinks.length) {
      await client.query("insert into dataset_process_businesses (dataset_id, process_business_id) select * from unnest($1::uuid[], $2::uuid[]) on conflict do nothing", [probisLinks.map(([d]) => d), probisLinks.map(([, p]) => p)]);
    }
    if (serviceLinks.length) {
      await client.query("insert into dataset_services (dataset_id, service_id) select * from unnest($1::uuid[], $2::uuid[]) on conflict do nothing", [serviceLinks.map(([d]) => d), serviceLinks.map(([, s]) => s)]);
    }
    await client.query(
      `insert into validation_history (dataset_id, actor_name, to_status, note)
       select id, 'Sistem', 'approved', 'Data contoh dari template analis' from datasets where is_sample`,
    );
    const { rows: [{ n }] } = await client.query("select count(*)::int as n from datasets where is_sample");
    console.log(`Data contoh dimasukkan: ${n} data (status Tervalidasi), ${probisLinks.length} tautan proses bisnis, ${serviceLinks.length} tautan layanan.`);
  }
  await client.query("commit");
} catch (error) {
  await client.query("rollback");
  throw error;
} finally {
  await client.end();
}
