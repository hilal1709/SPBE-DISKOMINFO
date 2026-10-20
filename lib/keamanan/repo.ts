import { getDb } from "@/lib/db";
import type { KegiatanKeamanan } from "@/lib/types";
import type { Kegiatan } from "./jenis";

/** Akses data Domain Keamanan untuk dashboard publik (server saja). */

/** Entri domain lain yang mencantumkan tiap jenis keamanan sebagai dependensi, per periode. */
export type Coverage = Record<string, { totals: Record<CoverageDomain, number>; byKey: Partial<Record<Kegiatan, Record<CoverageDomain, number>>> }>;
export type CoverageDomain = "data" | "aplikasi" | "infrastruktur";

const tables: [CoverageDomain, string][] = [
  ["data", "datasets"],
  ["aplikasi", "applications"],
  ["infrastruktur", "infrastructures"],
];

function db() {
  const pool = getDb();
  if (!pool) throw new Error("Database belum dikonfigurasi (DATABASE_URL).");
  return pool;
}

/** Kegiatan yang sudah divalidasi. Kosong bila modul CMS keamanan belum berisi data. */
export async function listApprovedKeamanan(): Promise<{ rows: KegiatanKeamanan[]; sample: boolean }> {
  const { rows } = await db().query(
    `select s.code, s.kind, s.name, s.description, to_char(s.activity_date, 'YYYY-MM-DD') as activity_date, s.attributes, o.code as opd, ap.name as period, s.is_sample
     from security_activities s
     join opd o on o.id = s.opd_id
     join architecture_periods ap on ap.id = s.period_id
     where s.status = 'approved'`,
  );
  return {
    rows: rows.map((r) => ({ id: r.code, jenis: r.kind, name: r.name, deskripsi: r.description, tanggal: r.activity_date, atribut: r.attributes ?? {}, opd: r.opd, period: r.period })),
    sample: rows.some((r) => r.is_sample),
  };
}

/** Hitung dependensi Keamanan SPBE yang diisi pada data, aplikasi, dan infrastruktur tervalidasi. */
export async function securityCoverage(): Promise<Coverage> {
  const coverage: Coverage = {};
  const slot = (period: string) => (coverage[period] ??= { totals: { data: 0, aplikasi: 0, infrastruktur: 0 }, byKey: {} });
  await Promise.all(
    tables.map(async ([domain, table]) => {
      const [totals, keys] = await Promise.all([
        db().query(`select ap.name as period, count(*)::int as n from ${table} t join architecture_periods ap on ap.id = t.period_id where t.status = 'approved' group by 1`),
        db().query(
          `select ap.name as period, e.key, count(*)::int as n
           from ${table} t join architecture_periods ap on ap.id = t.period_id
           cross join lateral jsonb_each(t.security) e
           where t.status = 'approved' and jsonb_typeof(e.value) = 'array' and jsonb_array_length(e.value) > 0
           group by 1, 2`,
        ),
      ]);
      for (const r of totals.rows) slot(r.period).totals[domain] = r.n;
      for (const r of keys.rows) {
        const byKey = slot(r.period).byKey;
        (byKey[r.key as Kegiatan] ??= { data: 0, aplikasi: 0, infrastruktur: 0 })[domain] = r.n;
      }
    }),
  );
  return coverage;
}
