// Isi database dengan data contoh layanan (sama dengan dashboard publik /layanan), atau hapus.
// Jalankan: pnpm seed:layanan          → hapus contoh lama lalu isi ulang (status Tervalidasi)
//           pnpm seed:layanan --hapus  → hapus semua layanan contoh
// Proses bisnis yang dilayani hanya ditautkan bila probis contohnya sudah ada (pnpm seed:contoh).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import { allLayanan } from "@/lib/layanan/generate";

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
  const removed = await client.query("delete from services where is_sample");
  console.log(`Layanan contoh lama dihapus: ${removed.rowCount}`);

  if (!process.argv.includes("--hapus")) {
    const idMap = async (sql: string) => new Map((await client.query(sql)).rows.map((r) => [r.key as string, r.id as string]));
    const opd = await idMap("select code as key, id from opd");
    const periods = await idMap("select name as key, id from architecture_periods");
    // Kode RAL/RAB unik per versi: cari di versi milik periode masing-masing.
    const ral = await idMap("select ap.name || '|' || r.code as key, r.id from ral_references r join architecture_periods ap on ap.ral_version_id = r.version_id where r.level = 3");
    const rab = await idMap("select ap.name || '|' || r.code as key, r.id from rab_references r join architecture_periods ap on ap.rab_version_id = r.version_id where r.level = 2");
    const probis = await idMap("select ap.name || '|' || pb.code as key, pb.id from process_businesses pb join architecture_periods ap on ap.id = pb.period_id");

    const rows = allLayanan();
    const missing = [...new Set(rows.map((r) => r.period))].filter((p) => !periods.has(p));
    if (missing.length) throw new Error(`Periode belum terdaftar: ${missing.join(", ")}. Tambahkan dulu di CMS › Periode Arsitektur.`);

    for (let i = 0; i < rows.length; i += 500) {
      const batch = rows.slice(i, i + 500);
      await client.query(
        `insert into services (code, name, purpose, function_name, unit, target, method, benefit, economic_potential, risk, mitigation, kl,
           opd_id, period_id, ral_id, rab_id, status, approved_at, is_sample)
         select t.*, 'approved'::submission_status, now(), true
         from unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[], $7::text[], $8::text[], $9::text[], $10::text[], $11::text[], $12::text[],
                     $13::uuid[], $14::uuid[], $15::uuid[], $16::uuid[])
           as t(code, name, purpose, function_name, unit, target, method, benefit, economic_potential, risk, mitigation, kl, opd_id, period_id, ral_id, rab_id)
         on conflict (code, period_id) do nothing`,
        [
          batch.map((r) => r.id),
          batch.map((r) => r.name),
          batch.map((r) => r.tujuan),
          batch.map((r) => r.fungsi),
          batch.map((r) => r.unit),
          batch.map((r) => r.target),
          batch.map((r) => r.metode),
          batch.map((r) => r.manfaat),
          batch.map((r) => r.ekonomi),
          batch.map((r) => r.risiko),
          batch.map((r) => r.mitigasi),
          batch.map((r) => r.kl),
          batch.map((r) => opd.get(r.pd)),
          batch.map((r) => periods.get(r.period)),
          batch.map((r) => ral.get(`${r.period}|${r.ral3}`)),
          batch.map((r) => (r.rab2 ? (rab.get(`${r.period}|${r.rab2}`) ?? null) : null)),
        ],
      );
    }

    const services = await idMap("select ap.name || '|' || s.code as key, s.id from services s join architecture_periods ap on ap.id = s.period_id where s.is_sample");
    const links = rows.flatMap((r) => r.probis.map((p) => [services.get(`${r.period}|${r.id}`), probis.get(`${r.period}|${p.id}`)] as const)).filter(([s, p]) => s && p);
    if (links.length) {
      await client.query("insert into service_process_businesses (service_id, process_business_id) select * from unnest($1::uuid[], $2::uuid[]) on conflict do nothing", [links.map(([s]) => s), links.map(([, p]) => p)]);
    }
    await client.query(
      `insert into validation_history (service_id, actor_name, to_status, note)
       select id, 'Sistem', 'approved', 'Data contoh dari template analis' from services where is_sample`,
    );
    const { rows: [{ n }] } = await client.query("select count(*)::int as n from services where is_sample");
    console.log(`Data contoh dimasukkan: ${n} layanan (status Tervalidasi), ${links.length} tautan proses bisnis.`);
  }
  await client.query("commit");
} catch (error) {
  await client.query("rollback");
  throw error;
} finally {
  await client.end();
}
