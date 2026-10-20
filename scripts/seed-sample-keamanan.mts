// Isi database dengan kegiatan contoh Domain Keamanan (sama dengan dashboard publik /keamanan), atau hapus.
// Jalankan: pnpm seed:keamanan          → hapus contoh lama lalu isi ulang (status Tervalidasi), sekaligus mengisi
//                                          dependensi keamanan pada data, aplikasi, dan infrastruktur contoh
//           pnpm seed:keamanan --hapus  → hapus semua kegiatan contoh
import { readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import { allKeamanan } from "@/lib/keamanan/generate";

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
  const removed = await client.query("delete from security_activities where is_sample");
  console.log(`Kegiatan contoh lama dihapus: ${removed.rowCount}`);

  if (!process.argv.includes("--hapus")) {
    const idMap = async (sql: string) => new Map((await client.query(sql)).rows.map((r) => [r.key as string, r.id as string]));
    const opd = await idMap("select code as key, id from opd");
    const periods = await idMap("select name as key, id from architecture_periods");
    const rows = allKeamanan();
    const missing = [...new Set(rows.map((r) => r.period))].filter((p) => !periods.has(p));
    if (missing.length) throw new Error(`Periode belum terdaftar: ${missing.join(", ")}. Tambahkan dulu di CMS › Periode Arsitektur.`);
    await client.query(
      `insert into security_activities (code, kind, name, description, activity_date, attributes, opd_id, period_id, status, approved_at, is_sample)
       select t.*, 'approved'::submission_status, now(), true
       from unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::date[], $6::jsonb[], $7::uuid[], $8::uuid[])
         as t(code, kind, name, description, activity_date, attributes, opd_id, period_id)
       on conflict (code, period_id) do nothing`,
      [
        rows.map((r) => r.id),
        rows.map((r) => r.jenis),
        rows.map((r) => r.name),
        rows.map((r) => r.deskripsi),
        rows.map((r) => r.tanggal),
        rows.map((r) => JSON.stringify(r.atribut)),
        rows.map((r) => opd.get(r.opd)),
        rows.map((r) => periods.get(r.period)),
      ],
    );
    await client.query(
      `insert into validation_history (security_activity_id, actor_name, to_status, note)
       select id, 'Sistem', 'approved', 'Kegiatan contoh dari template analis' from security_activities where is_sample`,
    );
    const { rows: [{ n }] } = await client.query("select count(*)::int as n from security_activities where is_sample");
    console.log(`Kegiatan contoh dimasukkan: ${n} (status Tervalidasi).`);

    // Dependensi Keamanan SPBE pada data, aplikasi, dan infrastruktur contoh: ditautkan ke kode kegiatan contoh di periode
    // yang sama, agar widget cakupan dependensi bermakna. Entri asli (bukan contoh) tidak disentuh.
    const share: Record<string, Record<string, number>> = {
      datasets: { standar: 0.7, audit: 0.35, kerentanan: 0.15, insiden: 0.12, edukasi: 0.08, peningkatan: 0.18, kelaikan: 0.1 },
      applications: { standar: 0.75, audit: 0.45, kerentanan: 0.4, insiden: 0.25, edukasi: 0.15, peningkatan: 0.35, kelaikan: 0.3 },
      infrastructures: { standar: 0.85, audit: 0.55, kerentanan: 0.45, insiden: 0.3, edukasi: 0.1, peningkatan: 0.5, kelaikan: 0.2 },
    };
    const byPeriod = new Map<string, Map<string, string[]>>();
    for (const r of rows) {
      const keys = byPeriod.get(r.period) ?? new Map<string, string[]>();
      keys.set(r.jenis, [...(keys.get(r.jenis) ?? []), r.id]);
      byPeriod.set(r.period, keys);
    }
    // Acak deterministik per id agar seed ulang memberi hasil yang sama.
    const hash = (text: string) => [...text].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7) / 2 ** 32;
    for (const [table, odds] of Object.entries(share)) {
      const { rows: targets } = await client.query(`select t.id, ap.name as period from ${table} t join architecture_periods ap on ap.id = t.period_id where t.is_sample`);
      const ids: string[] = [];
      const values: string[] = [];
      for (const t of targets) {
        const names = byPeriod.get(t.period);
        if (!names) continue;
        const security = Object.fromEntries(
          Object.entries(odds)
            .filter(([key]) => names.get(key)?.length && hash(`${t.id}:${key}`) < odds[key]!)
            .map(([key]) => {
              const list = names.get(key)!;
              return [key, [list[Math.floor(hash(`${t.id}:${key}:pick`) * list.length)]!]];
            }),
        );
        ids.push(t.id);
        values.push(JSON.stringify(security));
      }
      if (ids.length) await client.query(`update ${table} t set security = v.security from unnest($1::uuid[], $2::jsonb[]) as v(id, security) where t.id = v.id`, [ids, values]);
      console.log(`Dependensi keamanan contoh diisi: ${ids.length} baris ${table}.`);
    }
  }
  await client.query("commit");
} catch (error) {
  await client.query("rollback");
  throw error;
} finally {
  await client.end();
}
