import type { PoolClient } from "pg";
import { insertMany } from "@/lib/cms/batch";
import { getDb } from "@/lib/db";
import { domainKeys, type DomainKey } from "@/lib/domains";
import type { RencanaLink } from "@/lib/types";

/** Tautan kegiatan Peta Rencana ↔ entri arsitektur (tabel roadmap_item_links, dirujuk lewat kode pada periode kegiatan). Server saja. */

const TABLES: Record<DomainKey, string> = {
  probis: "process_businesses",
  layanan: "services",
  data: "datasets",
  aplikasi: "applications",
  infrastruktur: "infrastructures",
  keamanan: "security_activities",
};

const nameOf = `case l.domain ${domainKeys.map((d) => `when '${d}' then (select t.name from ${TABLES[d]} t where t.code = l.record_code and t.period_id = r.period_id limit 1)`).join(" ")} end`;

/** Kolom `tautan` (jsonb) untuk SELECT kegiatan beralias `r`: [{domain, code, name}]. */
export const LINKS_SQL = `(select coalesce(jsonb_agg(jsonb_build_object('domain', l.domain, 'code', l.record_code, 'name', coalesce(${nameOf}, l.record_code)) order by l.domain, l.record_code), '[]'::jsonb)
  from roadmap_item_links l where l.roadmap_item_id = r.id) as tautan`;

const publicName = `case l.domain ${domainKeys.map((d) => `when '${d}' then (select t.name from ${TABLES[d]} t where t.code = l.record_code and t.period_id = r.period_id and t.status = 'approved' limit 1)`).join(" ")} end`;

/** Versi portal: semua domain (web internal), hanya entri tervalidasi pada periode kegiatan. */
export const PUBLIC_LINKS_SQL = `(select coalesce(jsonb_agg(jsonb_build_object('domain', x.domain, 'code', x.code, 'name', x.name) order by x.domain, x.code), '[]'::jsonb)
  from (select l.domain, l.record_code as code, ${publicName} as name from roadmap_item_links l
        where l.roadmap_item_id = r.id) x where x.name is not null) as tautan`;

export type LinkInput = { domain: DomainKey; code: string };

/** Kode entri tervalidasi yang ada di salah satu domain (impor): [{domain, code, period}]. */
export async function resolveLinkCodes(codes: string[]): Promise<{ domain: DomainKey; code: string; period: string }[]> {
  if (!codes.length) return [];
  const sql = domainKeys.map((d) => `select '${d}'::text as domain, t.code, ap.name as period from ${TABLES[d]} t
     join architecture_periods ap on ap.id = t.period_id where t.status = 'approved' and t.code = any($1)`).join(" union all ");
  const { rows } = await db().query(sql, [codes]);
  return rows;
}

/** Ganti seluruh tautan satu kegiatan. */
export async function saveLinks(client: PoolClient, id: string, links: readonly LinkInput[]) {
  await client.query("delete from roadmap_item_links where roadmap_item_id = $1", [id]);
  const unique = [...new Map(links.map((l) => [`${l.domain}|${l.code}`, l])).values()];
  await insertMany(client, "roadmap_item_links", ["roadmap_item_id", "domain", "record_code"], unique.map((l) => [id, l.domain, l.code]));
}

export async function copyLinks(client: PoolClient, from: string, to: string) {
  await client.query("insert into roadmap_item_links (roadmap_item_id, domain, record_code) select $2, domain, record_code from roadmap_item_links where roadmap_item_id = $1 on conflict do nothing", [from, to]);
}

function db() {
  const pool = getDb();
  if (!pool) throw new Error("Database belum dikonfigurasi (DATABASE_URL).");
  return pool;
}

/** Pilihan entri tervalidasi satu domain pada satu periode; `opd` (kode) membatasi ke satu Perangkat Daerah. */
export async function linkOptions(period: string, domain: DomainKey, opd: string | null): Promise<{ code: string; name: string; opd: string }[]> {
  const { rows } = await db().query(
    `select t.code, t.name, o.code as opd from ${TABLES[domain]} t
     join opd o on o.id = t.opd_id join architecture_periods ap on ap.id = t.period_id
     where ap.name = $1 and t.status = 'approved' and ($2::text is null or o.code = $2) order by t.name limit 3000`,
    [period, opd],
  );
  return rows;
}

export type RelatedPlan = { id: string; code: string; name: string; year: number; status: string };

/** Kegiatan Peta Rencana yang menunjuk satu entri arsitektur (kode + periode). */
export async function relatedPlans(domain: DomainKey, code: string, period: string): Promise<RelatedPlan[]> {
  const { rows } = await db().query(
    `select r.id, r.code, r.name, r.year, r.status from roadmap_item_links l
     join roadmap_items r on r.id = l.roadmap_item_id join architecture_periods ap on ap.id = r.period_id
     where l.domain = $1 and l.record_code = $2 and ap.name = $3 order by r.year, r.code`,
    [domain, code, period],
  );
  return rows;
}

export type { RencanaLink };
