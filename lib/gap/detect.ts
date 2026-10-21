import type { PoolClient } from "pg";
import type { GapPriority, GapRule } from "./rules";

/** Temuan hasil satu aturan (sebelum disimpan). */
export type Finding = { rule: GapRule; subject_code: string; subject_name: string; opd_id: string | null; sasaran: string | null; as_is: string; rekomendasi: string; priority: GapPriority };

/** Sasaran strategis probis pertama yang tertaut lewat tabel penghubung `table(col, process_business_id)`. */
const sasaranVia = (table: string, col: string, id: string) =>
  `(select pb.strategic_goal from ${table} j join process_businesses pb on pb.id = j.process_business_id where j.${col} = ${id} and pb.strategic_goal is not null limit 1)`;

const hasArray = (key: string) => `(jsonb_typeof(a.security->'${key}') = 'array' and jsonb_array_length(a.security->'${key}') > 0)`;

/**
 * Satu query per aturan; semuanya hanya membaca entri tervalidasi (`approved`) pada periode `$1`.
 * Kolom keluaran sama dengan `Finding` (tanpa `rule`).
 */
const queries: Record<GapRule, string> = {
  probis_tanpa_aplikasi: `
    select pb.code as subject_code, pb.name as subject_name, pb.opd_id, pb.strategic_goal as sasaran,
           'Probis berstatus ' || case pb.probis_status when 'new' then 'Baru' else 'Upgrade' end || ' belum didukung aplikasi tervalidasi' as as_is,
           case pb.probis_status when 'new' then 'Pembangunan aplikasi pendukung ' else 'Pengembangan aplikasi pendukung ' end || pb.name as rekomendasi,
           case pb.probis_status when 'new' then 'tinggi' else 'sedang' end as priority
    from process_businesses pb
    where pb.period_id = $1 and pb.status = 'approved' and pb.probis_status in ('new', 'upgrade')
      and not exists (select 1 from application_process_businesses ap join applications a on a.id = ap.application_id and a.status = 'approved' where ap.process_business_id = pb.id)`,
  probis_tanpa_layanan: `
    select pb.code, pb.name, pb.opd_id, pb.strategic_goal,
           'Probis berstatus ' || case pb.probis_status when 'new' then 'Baru' else 'Upgrade' end || ' belum menghasilkan layanan tervalidasi',
           'Perancangan layanan untuk ' || pb.name, 'rendah'
    from process_businesses pb
    where pb.period_id = $1 and pb.status = 'approved' and pb.probis_status in ('new', 'upgrade')
      and not exists (select 1 from service_process_businesses sp join services s on s.id = sp.service_id and s.status = 'approved' where sp.process_business_id = pb.id)`,
  layanan_belum_digital: `
    select s.code, s.name, s.opd_id, ${sasaranVia("service_process_businesses", "service_id", "s.id")},
           case s.method when 'tatap_muka' then 'Layanan masih tatap muka' else 'Layanan masih hybrid (sebagian tatap muka)' end,
           'Digitalisasi layanan ' || s.name, case s.method when 'tatap_muka' then 'tinggi' else 'sedang' end
    from services s
    where s.period_id = $1 and s.status = 'approved' and s.method in ('tatap_muka', 'hybrid')`,
  aplikasi_tanpa_infra: `
    select a.code, a.name, a.opd_id, ${sasaranVia("application_process_businesses", "application_id", "a.id")},
           'Belum ada infrastruktur tervalidasi yang menjalankan aplikasi ini', 'Penempatan ' || a.name || ' di pusat data/cloud pemerintah', 'sedang'
    from applications a
    where a.period_id = $1 and a.status = 'approved'
      and not exists (select 1 from infrastructure_applications ia join infrastructures i on i.id = ia.infrastructure_id and i.status = 'approved' where ia.application_id = a.id)
      and not exists (select 1 from infrastructures i where i.period_id = a.period_id and i.status = 'approved' and lower(i.name) in (lower(a.cloud), lower(a.server)))`,
  aplikasi_tanpa_keamanan: `
    select a.code, a.name, a.opd_id, ${sasaranVia("application_process_businesses", "application_id", "a.id")},
           case when not ${hasArray("standar")} and not ${hasArray("audit")} then 'Belum mencantumkan standar maupun audit keamanan'
                when not ${hasArray("standar")} then 'Belum mencantumkan standar keamanan' else 'Belum pernah diaudit keamanannya' end,
           'Audit dan penerapan standar keamanan ' || a.name,
           case when exists (select 1 from application_services x where x.application_id = a.id) then 'tinggi' else 'sedang' end
    from applications a
    where a.period_id = $1 and a.status = 'approved' and not (${hasArray("standar")} and ${hasArray("audit")})`,
  data_tidak_interoperabel: `
    select d.code, d.name, d.opd_id, ${sasaranVia("dataset_process_businesses", "dataset_id", "d.id")},
           'Data belum interoperabel', 'Integrasi ' || d.name || ' ke portal Satu Data', 'sedang'
    from datasets d
    where d.period_id = $1 and d.status = 'approved' and not d.interoperable`,
  data_tanpa_aplikasi: `
    select d.code, d.name, d.opd_id, ${sasaranVia("dataset_process_businesses", "dataset_id", "d.id")},
           'Belum ada aplikasi tervalidasi yang menghasilkan atau memakai data ini', 'Pengelolaan ' || d.name || ' melalui aplikasi', 'rendah'
    from datasets d
    where d.period_id = $1 and d.status = 'approved'
      and not exists (select 1 from application_datasets ad join applications a on a.id = ad.application_id and a.status = 'approved' where ad.dataset_id = d.id)`,
  standar_kedaluwarsa: `
    select sa.code, sa.name, sa.opd_id, null,
           'Masa berlaku berakhir ' || to_char((sa.attributes->>'akhir')::date, 'DD-MM-YYYY'), 'Pembaruan ' || sa.name, 'tinggi'
    from security_activities sa
    where sa.period_id = $1 and sa.status = 'approved' and sa.kind = 'standar'
      and sa.attributes->>'akhir' ~ '^\\d{4}-\\d{2}-\\d{2}$' and (sa.attributes->>'akhir')::date < current_date`,
};

const COLUMNS = ["subject_code", "subject_name", "opd_id", "sasaran", "as_is", "rekomendasi", "priority"] as const;

/** Jalankan semua aturan untuk satu periode. */
export async function detectGaps(client: PoolClient, periodId: string): Promise<Finding[]> {
  // Berurutan: satu koneksi transaksi tidak boleh menjalankan query paralel.
  const findings: Finding[] = [];
  for (const [rule, sql] of Object.entries(queries) as [GapRule, string][]) {
    const { rows } = await client.query({ text: sql, values: [periodId], rowMode: "array" });
    findings.push(...rows.map((r: unknown[]) => ({ rule, ...Object.fromEntries(COLUMNS.map((c, i) => [c, r[i]])) }) as Finding));
  }
  return findings;
}
