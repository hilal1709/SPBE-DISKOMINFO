import { getDb } from "@/lib/db";
import type { Layanan } from "@/lib/types";

/** Akses data Domain Layanan untuk dashboard publik (server saja). */

/** Target & metode di tabel `services` berupa teks bebas; disamakan ke pilihan dashboard. */
const toTarget = (text: string | null): Layanan["target"] => {
  const t = (text ?? "").toLowerCase();
  return /usaha|investor|industri/.test(t) ? "usaha" : /asn|pegawai/.test(t) ? "asn" : /pemerintah|perangkat|opd|instansi/.test(t) ? "pemerintah" : "masyarakat";
};
const toMetode = (text: string | null): Layanan["metode"] => {
  const t = (text ?? "").toLowerCase();
  return /hybrid|campur/.test(t) ? "hybrid" : /elektronik|online|daring|digital|aplikasi/.test(t) ? "elektronik" : "tatap_muka";
};

/** Layanan yang sudah disetujui. Kosong bila modul CMS layanan belum berisi data. */
export async function listApprovedServices(): Promise<Layanan[]> {
  const pool = getDb();
  if (!pool) throw new Error("Database belum dikonfigurasi (DATABASE_URL).");
  const { rows } = await pool.query(
    `select s.code, s.name, s.purpose, s.function_name, o.code as opd_code, ap.name as period, s.method, s.target,
            s.benefit, s.economic_potential, s.risk, s.mitigation, r1.code as ral1, r2.code as ral2, r3.code as ral3, rb.code as rab,
            coalesce(json_agg(json_build_object('id', pb.code, 'name', pb.name)) filter (where pb.id is not null), '[]') as probis
     from services s
     join opd o on o.id = s.opd_id
     join architecture_periods ap on ap.id = s.period_id
     join ral_references r3 on r3.id = s.ral_id and r3.level = 3
     join ral_references r2 on r2.id = r3.parent_id
     join ral_references r1 on r1.id = r2.parent_id
     left join rab_references rb on rb.id = s.rab_id
     left join service_process_businesses sp on sp.service_id = s.id
     left join process_businesses pb on pb.id = sp.process_business_id
     where s.status = 'approved'
     group by s.id, o.code, ap.name, r1.code, r2.code, r3.code, rb.code`,
  );
  return rows.map((r) => ({
    id: r.code,
    name: r.name,
    tujuan: r.purpose ?? "",
    fungsi: r.function_name ?? "",
    pd: r.opd_code,
    unit: "",
    target: toTarget(r.target),
    metode: toMetode(r.method),
    period: r.period,
    ral1: r.ral1,
    ral2: r.ral2,
    ral3: r.ral3,
    rab2: r.rab,
    manfaat: r.benefit,
    ekonomi: r.economic_potential,
    risiko: r.risk,
    mitigasi: r.mitigation,
    kl: null,
    probis: r.probis,
  }));
}
