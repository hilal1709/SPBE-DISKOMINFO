// Isi database dengan aplikasi contoh Domain Aplikasi (sama dengan dashboard publik /aplikasi), atau hapus.
// Jalankan: pnpm seed:aplikasi          → hapus contoh lama lalu isi ulang (status Tervalidasi)
//           pnpm seed:aplikasi --hapus  → hapus semua aplikasi contoh
// Aplikasi wajib tertaut proses bisnis tervalidasi: jalankan pnpm seed:contoh dulu (lalu seed:layanan, seed:data
// agar tautan layanan & data ikut terisi). Aplikasi tanpa padanan probis tervalidasi dilewati.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import { allAplikasi } from "@/lib/aplikasi/generate";
import { pdByCode } from "@/lib/probis/reference";

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
  const removed = await client.query("delete from applications where is_sample");
  console.log(`Aplikasi contoh lama dihapus: ${removed.rowCount}`);

  if (!process.argv.includes("--hapus")) {
    const idMap = async (sql: string) => new Map((await client.query(sql)).rows.map((r) => [r.key as string, r.id as string]));
    const opd = await idMap("select code as key, id from opd");
    const periods = await idMap("select name as key, id from architecture_periods");
    // Kode RAA unik per versi: cari di versi milik periode masing-masing (L3, atau L2 tanpa turunan).
    const raa = await idMap("select ap.name || '|' || r.code as key, r.id from raa_references r join architecture_periods ap on ap.raa_version_id = r.version_id where r.level in (2, 3)");
    const probis = await idMap("select ap.name || '|' || pb.code as key, pb.id from process_businesses pb join architecture_periods ap on ap.id = pb.period_id where pb.status = 'approved'");
    const services = await idMap("select ap.name || '|' || s.code as key, s.id from services s join architecture_periods ap on ap.id = s.period_id");
    const datasets = await idMap("select ap.name || '|' || d.code as key, d.id from datasets d join architecture_periods ap on ap.id = d.period_id");

    const all = allAplikasi();
    const missing = [...new Set(all.map((r) => r.period))].filter((p) => !periods.has(p));
    if (missing.length) throw new Error(`Periode belum terdaftar: ${missing.join(", ")}. Tambahkan dulu di CMS › Periode Arsitektur.`);
    // Notulen: aplikasi wajib selaras proses bisnis yang disetujui.
    const rows = all.filter((r) => r.probis.some((p) => probis.has(`${r.period}|${p.id}`)));
    if (rows.length < all.length) console.log(`Dilewati (tanpa probis tervalidasi): ${all.length - rows.length} aplikasi.`);

    for (let i = 0; i < rows.length; i += 500) {
      const batch = rows.slice(i, i + 500);
      const developerPd = (r: (typeof rows)[number]) => pdByCode.has(r.pengembang);
      await client.query(
        `insert into applications (code, name, description, function_desc, output, db_engine, basis, license, language, framework, developer,
           supplier, customer, cloud, server, splp, jip, opd_id, developer_opd_id, period_id, raa_id, status, approved_at, is_sample)
         select t.*, 'approved'::submission_status, now(), true
         from unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[], $7::text[], $8::text[], $9::text[], $10::text[], $11::text[],
                     $12::text[], $13::text[], $14::text[], $15::text[], $16::text[], $17::text[], $18::uuid[], $19::uuid[], $20::uuid[], $21::uuid[])
           as t(code, name, description, function_desc, output, db_engine, basis, license, language, framework, developer,
                supplier, customer, cloud, server, splp, jip, opd_id, developer_opd_id, period_id, raa_id)
         on conflict (code, period_id) do nothing`,
        [
          batch.map((r) => r.id),
          batch.map((r) => r.name),
          batch.map((r) => r.uraian),
          batch.map((r) => r.fungsi),
          batch.map((r) => r.luaran),
          batch.map((r) => r.mesin),
          batch.map((r) => r.basis),
          batch.map((r) => r.lisensi),
          batch.map((r) => r.bahasa),
          batch.map((r) => r.kerangka),
          batch.map((r) => (developerPd(r) ? null : r.pengembang)),
          batch.map((r) => r.supplier),
          batch.map((r) => r.customer),
          batch.map((r) => r.cloud),
          batch.map((r) => r.server),
          batch.map((r) => r.splp),
          batch.map((r) => r.jip),
          batch.map((r) => opd.get(r.operasional)),
          batch.map((r) => (developerPd(r) ? opd.get(r.pengembang) : null)),
          batch.map((r) => periods.get(r.period)),
          batch.map((r) => raa.get(`${r.period}|${r.raa2}`)),
        ],
      );
    }

    const apps = await idMap("select ap.name || '|' || a.code as key, a.id from applications a join architecture_periods ap on ap.id = a.period_id where a.is_sample");
    const link = async (table: string, col: string, pick: (r: (typeof rows)[number]) => { id: string }[], target: Map<string, string>) => {
      const pairs = rows.flatMap((r) => pick(r).map((p) => [apps.get(`${r.period}|${r.id}`), target.get(`${r.period}|${p.id}`)] as const)).filter(([a, t]) => a && t);
      if (pairs.length) await client.query(`insert into ${table} (application_id, ${col}) select * from unnest($1::uuid[], $2::uuid[]) on conflict do nothing`, [pairs.map(([a]) => a), pairs.map(([, t]) => t)]);
      return pairs.length;
    };
    const nProbis = await link("application_process_businesses", "process_business_id", (r) => r.probis, probis);
    const nLayanan = await link("application_services", "service_id", (r) => r.layanan, services);
    const nData = await link("application_datasets", "dataset_id", (r) => r.data, datasets);
    await client.query(
      `insert into validation_history (application_id, actor_name, to_status, note)
       select id, 'Sistem', 'approved', 'Aplikasi contoh dari template analis' from applications where is_sample`,
    );
    const { rows: [{ n }] } = await client.query("select count(*)::int as n from applications where is_sample");
    console.log(`Aplikasi contoh dimasukkan: ${n} aplikasi (status Tervalidasi), ${nProbis} tautan proses bisnis, ${nLayanan} tautan layanan, ${nData} tautan data.`);
  }
  await client.query("commit");
} catch (error) {
  await client.query("rollback");
  throw error;
} finally {
  await client.end();
}
