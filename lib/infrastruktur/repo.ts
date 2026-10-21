import { getDb } from "@/lib/db";
import type { Infrastruktur } from "@/lib/types";
import { RAI_JOIN, RAI_SQL } from "./cms-repo";
import { cached, TAGS } from "@/lib/cache";

/** Akses data Domain Infrastruktur untuk dashboard publik (server saja). */

/** Relasi publik: hanya entri tervalidasi. Aplikasi juga dicocokkan lewat kolom infrastruktur aplikasi (komputasi awan, server, SPLP, JIP). */
const PUBLIC_LINKS = `
  coalesce((select json_agg(json_build_object('id', t.code, 'name', t.name, 'jenis', t.kind) order by t.kind, t.code)
            from infrastructure_links x join infrastructures t on t.id = x.target_id
            where x.infrastructure_id = i.id and t.status = 'approved'), '[]') as relasi,
  coalesce((select json_agg(json_build_object('id', t.code, 'name', t.name, 'jenis', t.kind) order by t.kind, t.code)
            from infrastructure_links x join infrastructures t on t.id = x.infrastructure_id
            where x.target_id = i.id and t.status = 'approved'), '[]') as terhubung,
  coalesce((select json_agg(json_build_object('id', a.code, 'name', a.name) order by a.code)
            from applications a
            where a.period_id = i.period_id and a.status = 'approved'
              and (exists (select 1 from infrastructure_applications x where x.infrastructure_id = i.id and x.application_id = a.id)
                   or lower(i.name) in (lower(a.cloud), lower(a.server), lower(a.splp), lower(a.jip)))), '[]') as aplikasi,
  coalesce((select json_agg(json_build_object('id', d.code, 'name', d.name) order by d.code)
            from infrastructure_datasets x join datasets d on d.id = x.dataset_id
            where x.infrastructure_id = i.id and d.status = 'approved'), '[]') as data,
  coalesce((select json_agg(json_build_object('id', pb.code, 'name', pb.name) order by pb.code)
            from infrastructure_process_businesses x join process_businesses pb on pb.id = x.process_business_id
            where x.infrastructure_id = i.id and pb.status = 'approved'), '[]') as probis`;

/** Komponen yang sudah divalidasi. Kosong bila modul CMS infrastruktur belum berisi data. */
async function loadListApprovedInfrastruktur(): Promise<{ rows: Infrastruktur[]; sample: boolean }> {
  const pool = getDb();
  if (!pool) throw new Error("Database belum dikonfigurasi (DATABASE_URL).");
  const { rows } = await pool.query(
    `select i.code, i.kind, i.name, i.description, i.owner_name, i.ownership, i.manager, i.attributes, i.security,
            o.code as opd, ap.name as period, i.is_sample,
            ${RAI_SQL},
            ${PUBLIC_LINKS}
     from infrastructures i
     join opd o on o.id = i.opd_id
     join architecture_periods ap on ap.id = i.period_id
     ${RAI_JOIN}
     where i.status = 'approved' and i.rai_id is not null`,
  );
  const mapped: Infrastruktur[] = rows.map((r) => ({
    id: r.code,
    name: r.name,
    jenis: r.kind,
    deskripsi: r.description,
    pemilik: r.owner_name,
    kepemilikan: r.ownership,
    pengelola: r.manager,
    opd: r.opd,
    period: r.period,
    rai1: r.rai1,
    rai2: r.rai2,
    atribut: r.attributes ?? {},
    relasi: r.relasi,
    terhubung: r.terhubung,
    aplikasi: r.aplikasi,
    data: r.data,
    probis: r.probis,
    security: r.security ?? {},
  }));
  return { rows: mapped, sample: rows.some((r) => r.is_sample) };
}

/** Bacaan ber-cache (dibagi semua request, dibuang saat CMS menyimpan). */
export const listApprovedInfrastruktur = cached(loadListApprovedInfrastruktur, "infrastruktur/repo:listApprovedInfrastruktur", [TAGS.content]);
