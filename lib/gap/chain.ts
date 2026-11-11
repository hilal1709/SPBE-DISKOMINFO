import { cached, TAGS } from "@/lib/cache";
import { getDb } from "@/lib/db";
import { chainStages, type ChainStage } from "./rules";

/**
 * Kelengkapan arsitektur per proses bisnis: apakah probis sudah punya layanan, data, aplikasi, infrastruktur, dan
 * keamanan tervalidasi. Tiap domain dihitung terjangkau langsung atau lewat rantai Probis → Layanan → Data →
 * Aplikasi → Infrastruktur → Keamanan, mengikuti relasi yang sama dengan peta Integrasi.
 */
export type ChainRow = {
  code: string;
  name: string;
  opd: string;
  opdName: string;
  layanan: number;
  data: number;
  aplikasi: number;
  infrastruktur: number;
  keamanan: number;
};

export type ChainItem = { code: string; name: string };
export type ChainDetail = Record<ChainStage, ChainItem[]>;

const approved = (table: string, alias: string, on: string) => `join ${table} ${alias} on ${on} and ${alias}.status = 'approved'`;
/** Kegiatan keamanan tervalidasi yang dirujuk kolom `security` (jsonb {jenis: [kode]}). */
const securityOf = (alias: string) =>
  `cross join lateral jsonb_each(case when jsonb_typeof(${alias}.security) = 'object' then ${alias}.security else '{}'::jsonb end) e
   cross join lateral jsonb_array_elements_text(case when jsonb_typeof(e.value) = 'array' then e.value else '[]'::jsonb end) k(code)
   join security_activities sa on sa.code = k.code and sa.kind = e.key and sa.period_id = ${alias}.period_id and sa.status = 'approved'`;

/** CTE rantai; `pb` disaring periode ($1), cakupan OPD ($2), dan opsional kode probis ($3). */
const CHAIN = `
  with pb as (
    select p.id, p.code, p.name, p.opd_id from process_businesses p
    where p.period_id = $1 and p.status = 'approved' and ($2::uuid is null or p.opd_id = $2) and ($3::text is null or p.code = $3)
  ),
  sv as (
    select distinct x.process_business_id as pb, s.id from service_process_businesses x join pb on pb.id = x.process_business_id ${approved("services", "s", "s.id = x.service_id")}
  ),
  ds as (
    select x.process_business_id as pb, d.id from dataset_process_businesses x join pb on pb.id = x.process_business_id ${approved("datasets", "d", "d.id = x.dataset_id")}
    union select sv.pb, d.id from sv join dataset_services x on x.service_id = sv.id ${approved("datasets", "d", "d.id = x.dataset_id")}
  ),
  ap as (
    select x.process_business_id as pb, a.id from application_process_businesses x join pb on pb.id = x.process_business_id ${approved("applications", "a", "a.id = x.application_id")}
    union select sv.pb, a.id from sv join application_services x on x.service_id = sv.id ${approved("applications", "a", "a.id = x.application_id")}
    union select ds.pb, a.id from ds join application_datasets x on x.dataset_id = ds.id ${approved("applications", "a", "a.id = x.application_id")}
  ),
  inf as (
    select x.process_business_id as pb, i.id from infrastructure_process_businesses x join pb on pb.id = x.process_business_id ${approved("infrastructures", "i", "i.id = x.infrastructure_id")}
    union select ap.pb, i.id from ap join infrastructure_applications x on x.application_id = ap.id ${approved("infrastructures", "i", "i.id = x.infrastructure_id")}
    union select ap.pb, i.id from ap join applications a on a.id = ap.id
      join infrastructures i on i.period_id = $1 and i.status = 'approved' and lower(i.name) in (lower(a.cloud), lower(a.server), lower(a.splp), lower(a.jip))
  ),
  sec as (
    select ds.pb, sa.id from ds join datasets t on t.id = ds.id ${securityOf("t")}
    union select ap.pb, sa.id from ap join applications t on t.id = ap.id ${securityOf("t")}
    union select inf.pb, sa.id from inf join infrastructures t on t.id = inf.id ${securityOf("t")}
  )`;

const SUMMARY = `${CHAIN}
  select pb.code, pb.name, o.code as opd, coalesce(op.name, o.name) as opd_name,
         coalesce(n.layanan, 0)::int as layanan, coalesce(n.data, 0)::int as data, coalesce(n.aplikasi, 0)::int as aplikasi,
         coalesce(n.infrastruktur, 0)::int as infrastruktur, coalesce(n.keamanan, 0)::int as keamanan
  from pb
  join opd o on o.id = pb.opd_id
  left join opd_periods op on op.opd_id = o.id and op.period_id = $1
  left join (
    select pb, count(*) filter (where k = 'l') as layanan, count(*) filter (where k = 'd') as data, count(*) filter (where k = 'a') as aplikasi,
           count(*) filter (where k = 'i') as infrastruktur, count(*) filter (where k = 's') as keamanan
    from (select pb, 'l' as k from sv union all select pb, 'd' from ds union all select pb, 'a' from ap union all select pb, 'i' from inf union all select pb, 's' from sec) t
    group by pb
  ) n on n.pb = pb.id
  order by pb.name`;

const DETAIL = `${CHAIN}
  select 'layanan' as stage, s.code, s.name from sv join services s on s.id = sv.id
  union select 'data', d.code, d.name from ds join datasets d on d.id = ds.id
  union select 'aplikasi', a.code, a.name from ap join applications a on a.id = ap.id
  union select 'infrastruktur', i.code, i.name from inf join infrastructures i on i.id = inf.id
  union select 'keamanan', s.code, s.name from sec join security_activities s on s.id = sec.id
  order by 1, 3`;

async function periodId(period: string) {
  const pool = getDb();
  if (!pool) throw new Error("Database belum dikonfigurasi (DATABASE_URL).");
  const found = await pool.query("select id from architecture_periods where name = $1", [period]);
  return { pool, id: (found.rows[0]?.id as string | undefined) ?? null };
}

async function loadCoverage(period: string, opdId: string | null): Promise<ChainRow[]> {
  const { pool, id } = await periodId(period);
  if (!id) return [];
  const { rows } = await pool.query(SUMMARY, [id, opdId, null]);
  return rows.map((r) => ({ code: r.code, name: r.name, opd: r.opd, opdName: r.opd_name, layanan: r.layanan, data: r.data, aplikasi: r.aplikasi, infrastruktur: r.infrastruktur, keamanan: r.keamanan }));
}

/** Kelengkapan semua probis tervalidasi satu periode (di-cache; dibersihkan saat isian domain berubah). */
export const chainCoverage = cached(loadCoverage, "gap/chain:coverage", [TAGS.content]);

/** Nama entri tiap domain yang tersambung ke satu probis. */
export async function chainDetail(period: string, opdId: string | null, code: string): Promise<ChainDetail> {
  const detail = Object.fromEntries(chainStages.map((s) => [s, [] as ChainItem[]])) as ChainDetail;
  const { pool, id } = await periodId(period);
  if (!id) return detail;
  const { rows } = await pool.query(DETAIL, [id, opdId, code]);
  for (const r of rows) detail[r.stage as ChainStage]?.push({ code: r.code, name: r.name });
  return detail;
}
