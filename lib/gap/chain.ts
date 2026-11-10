import { getDb } from "@/lib/db";
import { chainStages, type ChainStage } from "./rules";

/**
 * Rantai arsitektur per proses bisnis: Probis → Layanan → Data → Aplikasi → Infrastruktur → Keamanan.
 * Tiap tahap menghitung entri tervalidasi yang terjangkau dari probis itu, langsung atau lewat tahap sebelumnya,
 * mengikuti relasi yang sama dengan peta Integrasi. Tahap pertama yang kosong = tempat rantai putus.
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
  /** Tahap pertama yang kosong; null bila rantai utuh. */
  putus: ChainStage | null;
};

const approved = (table: string, alias: string, on: string) => `join ${table} ${alias} on ${on} and ${alias}.status = 'approved'`;
/** Kode kegiatan keamanan yang dirujuk kolom `security` (jsonb {kunci: [kode]}). */
const securityOf = (alias: string) =>
  `cross join lateral jsonb_each(case when jsonb_typeof(${alias}.security) = 'object' then ${alias}.security else '{}'::jsonb end) e
   cross join lateral jsonb_array_elements_text(case when jsonb_typeof(e.value) = 'array' then e.value else '[]'::jsonb end) k(code)`;

const SQL = `
  with pb as (
    select p.id, p.code, p.name, p.opd_id from process_businesses p
    where p.period_id = $1 and p.status = 'approved' and ($2::uuid is null or p.opd_id = $2)
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
    select ds.pb, k.code from ds join datasets t on t.id = ds.id ${securityOf("t")}
    union select ap.pb, k.code from ap join applications t on t.id = ap.id ${securityOf("t")}
    union select inf.pb, k.code from inf join infrastructures t on t.id = inf.id ${securityOf("t")}
  )
  select pb.code, pb.name, o.code as opd, coalesce(op.name, o.name) as opd_name,
         coalesce((select count(*) from sv where sv.pb = pb.id), 0)::int as layanan,
         coalesce(dn.n, 0)::int as data, coalesce(an.n, 0)::int as aplikasi, coalesce(inn.n, 0)::int as infrastruktur, coalesce(sn.n, 0)::int as keamanan
  from pb
  join opd o on o.id = pb.opd_id
  left join opd_periods op on op.opd_id = o.id and op.period_id = $1
  left join (select pb, count(*) as n from ds group by pb) dn on dn.pb = pb.id
  left join (select pb, count(*) as n from ap group by pb) an on an.pb = pb.id
  left join (select pb, count(*) as n from inf group by pb) inn on inn.pb = pb.id
  left join (select pb, count(*) as n from sec group by pb) sn on sn.pb = pb.id
  order by pb.name`;

export async function chainCoverage(period: string, opdId: string | null): Promise<ChainRow[]> {
  const pool = getDb();
  if (!pool) throw new Error("Database belum dikonfigurasi (DATABASE_URL).");
  const found = await pool.query("select id from architecture_periods where name = $1", [period]);
  if (!found.rows[0]) return [];
  const { rows } = await pool.query(SQL, [found.rows[0].id, opdId]);
  return rows.map((r) => ({
    code: r.code,
    name: r.name,
    opd: r.opd,
    opdName: r.opd_name,
    layanan: r.layanan,
    data: r.data,
    aplikasi: r.aplikasi,
    infrastruktur: r.infrastruktur,
    keamanan: r.keamanan,
    putus: chainStages.find((stage) => !r[stage]) ?? null,
  }));
}
