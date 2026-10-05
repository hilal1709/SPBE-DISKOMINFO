import { getDb } from "@/lib/db";
import type { DataInfo } from "@/lib/types";

/** Akses data Domain Data untuk dashboard publik (server saja). */

/** Data yang sudah disetujui. Kosong bila modul CMS data belum berisi data. */
export async function listApprovedData(): Promise<{ rows: DataInfo[]; sample: boolean }> {
  const pool = getDb();
  if (!pool) throw new Error("Database belum dikonfigurasi (DATABASE_URL).");
  const { rows } = await pool.query(
    `select d.code, d.name, d.description, d.purpose, o.code as wali, coalesce(po.code, d.producer, o.code) as produsen, d.output_info, d.input_info,
            d.sifat, d.jenis, d.validitas, d.interoperable, ap.name as period, d.is_sample,
            case when n.level = 3 then p2.code else p1.code end as rad1,
            case when n.level = 3 then p1.code else n.code end as rad2,
            case when n.level = 3 then n.code end as rad3,
            coalesce((select json_agg(json_build_object('id', pb.code, 'name', pb.name) order by pb.code)
                      from dataset_process_businesses dp join process_businesses pb on pb.id = dp.process_business_id where dp.dataset_id = d.id), '[]') as probis,
            coalesce((select json_agg(json_build_object('id', s.code, 'name', s.name) order by s.code)
                      from dataset_services ds join services s on s.id = ds.service_id where ds.dataset_id = d.id), '[]') as layanan
     from datasets d
     join opd o on o.id = d.opd_id
     left join opd po on po.id = d.producer_opd_id
     join architecture_periods ap on ap.id = d.period_id
     join rad_references n on n.id = d.rad_id
     left join rad_references p1 on p1.id = n.parent_id
     left join rad_references p2 on p2.id = p1.parent_id
     where d.status = 'approved'`,
  );
  const mapped: DataInfo[] = rows.map((r) => ({
    id: r.code,
    name: r.name,
    uraian: r.description ?? "",
    tujuan: r.purpose ?? "",
    produsen: r.produsen,
    wali: r.wali,
    output: r.output_info,
    input: r.input_info,
    sifat: r.sifat,
    jenis: r.jenis,
    validitas: r.validitas,
    interoperabel: r.interoperable,
    period: r.period,
    rad1: r.rad1,
    rad2: r.rad2,
    rad3: r.rad3,
    probis: r.probis,
    layanan: r.layanan,
  }));
  return { rows: mapped, sample: rows.some((r) => r.is_sample) };
}
