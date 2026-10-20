// Isi database dengan komponen contoh Domain Infrastruktur (sama dengan dashboard publik /domain-infrastruktur), atau hapus.
// Jalankan: pnpm seed:infrastruktur          → hapus contoh lama lalu isi ulang (status Tervalidasi)
//           pnpm seed:infrastruktur --hapus  → hapus semua komponen contoh
// Jalankan seed:contoh, seed:data, dan seed:aplikasi dulu agar tautan proses bisnis, data, dan aplikasi ikut terisi.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import { allInfrastruktur } from "@/lib/infrastruktur/generate";

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
  const removed = await client.query("delete from infrastructures where is_sample");
  console.log(`Komponen contoh lama dihapus: ${removed.rowCount}`);

  if (!process.argv.includes("--hapus")) {
    const idMap = async (sql: string) => new Map((await client.query(sql)).rows.map((r) => [r.key as string, r.id as string]));
    const opd = await idMap("select code as key, id from opd");
    const periods = await idMap("select name as key, id from architecture_periods");
    // Kode RAI unik per versi: cari di versi milik periode masing-masing (L3, atau L2 tanpa turunan).
    const rai = await idMap("select ap.name || '|' || r.code as key, r.id from rai_references r join architecture_periods ap on ap.rai_version_id = r.version_id where r.level in (2, 3)");

    const rows = allInfrastruktur();
    const missing = [...new Set(rows.map((r) => r.period))].filter((p) => !periods.has(p));
    if (missing.length) throw new Error(`Periode belum terdaftar: ${missing.join(", ")}. Tambahkan dulu di CMS › Periode Arsitektur.`);

    await client.query(
      `insert into infrastructures (code, kind, name, description, owner_name, ownership, manager, attributes, security, opd_id, period_id, rai_id, status, approved_at, is_sample)
       select t.*, 'approved'::submission_status, now(), true
       from unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[], $7::text[], $8::jsonb[], $9::jsonb[], $10::uuid[], $11::uuid[], $12::uuid[])
         as t(code, kind, name, description, owner_name, ownership, manager, attributes, security, opd_id, period_id, rai_id)
       on conflict (code, period_id) do nothing`,
      [
        rows.map((r) => r.id),
        rows.map((r) => r.jenis),
        rows.map((r) => r.name),
        rows.map((r) => r.deskripsi),
        rows.map((r) => r.pemilik),
        rows.map((r) => r.kepemilikan),
        rows.map((r) => r.pengelola),
        rows.map((r) => JSON.stringify(r.atribut)),
        rows.map((r) => JSON.stringify(r.security)),
        rows.map((r) => opd.get(r.opd)),
        rows.map((r) => periods.get(r.period)),
        rows.map((r) => rai.get(`${r.period}|${r.rai2}`)),
      ],
    );

    const infra = await idMap("select ap.name || '|' || i.code as key, i.id from infrastructures i join architecture_periods ap on ap.id = i.period_id where i.is_sample");
    const apps = await idMap("select ap.name || '|' || a.code as key, a.id from applications a join architecture_periods ap on ap.id = a.period_id");
    const datasets = await idMap("select ap.name || '|' || d.code as key, d.id from datasets d join architecture_periods ap on ap.id = d.period_id");
    const probis = await idMap("select ap.name || '|' || pb.code as key, pb.id from process_businesses pb join architecture_periods ap on ap.id = pb.period_id where pb.status = 'approved'");
    const link = async (table: string, col: string, pick: (r: (typeof rows)[number]) => { id: string }[], target: Map<string, string>) => {
      const pairs = rows.flatMap((r) => pick(r).map((p) => [infra.get(`${r.period}|${r.id}`), target.get(`${r.period}|${p.id}`)] as const)).filter(([a, t]) => a && t);
      if (pairs.length) await client.query(`insert into ${table} (infrastructure_id, ${col}) select * from unnest($1::uuid[], $2::uuid[]) on conflict do nothing`, [pairs.map(([a]) => a), pairs.map(([, t]) => t)]);
      return pairs.length;
    };
    const nRelasi = await link("infrastructure_links", "target_id", (r) => r.relasi, infra);
    const nApps = await link("infrastructure_applications", "application_id", (r) => r.aplikasi, apps);
    const nData = await link("infrastructure_datasets", "dataset_id", (r) => r.data, datasets);
    const nProbis = await link("infrastructure_process_businesses", "process_business_id", (r) => r.probis, probis);
    await client.query(
      `insert into validation_history (infrastructure_id, actor_name, to_status, note)
       select id, 'Sistem', 'approved', 'Komponen contoh dari template analis' from infrastructures where is_sample`,
    );
    const { rows: [{ n }] } = await client.query("select count(*)::int as n from infrastructures where is_sample");
    console.log(`Komponen contoh dimasukkan: ${n} (status Tervalidasi), ${nRelasi} relasi antarkomponen, ${nApps} tautan aplikasi, ${nData} tautan data, ${nProbis} tautan proses bisnis.`);
  }
  await client.query("commit");
} catch (error) {
  await client.query("rollback");
  throw error;
} finally {
  await client.end();
}
