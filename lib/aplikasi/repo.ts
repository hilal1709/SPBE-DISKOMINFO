import { getDb } from "@/lib/db";
import type { Aplikasi } from "@/lib/types";
import { linksSql, RAA_JOIN, RAA_SQL } from "./cms-repo";
import { kepemilikanOf } from "./reference";
import { cached, TAGS } from "@/lib/cache";

/** Akses data Domain Aplikasi untuk dashboard publik (server saja). */

/** Aplikasi yang sudah divalidasi. Kosong bila modul CMS aplikasi belum berisi data. */
async function loadListApprovedAplikasi(): Promise<{ rows: Aplikasi[]; sample: boolean }> {
  const pool = getDb();
  if (!pool) throw new Error("Database belum dikonfigurasi (DATABASE_URL).");
  const { rows } = await pool.query(
    `select a.code, a.name, a.description, a.function_desc, a.output, a.db_engine, a.basis, a.license, a.language, a.framework,
            o.code as operasional, coalesce(dv.code, a.developer, o.code) as developer, ap.name as period, a.is_sample,
            a.supplier, a.customer, a.cloud, a.server, a.splp, a.jip,
            ${RAA_SQL},
            ${linksSql(true)}
     from applications a
     join opd o on o.id = a.opd_id
     left join opd dv on dv.id = a.developer_opd_id
     join architecture_periods ap on ap.id = a.period_id
     ${RAA_JOIN}
     where a.status = 'approved' and a.raa_id is not null`,
  );
  const mapped: Aplikasi[] = rows.map((r) => ({
    id: r.code,
    name: r.name,
    uraian: r.description,
    fungsi: r.function_desc,
    luaran: r.output,
    mesin: r.db_engine,
    basis: r.basis,
    lisensi: r.license,
    bahasa: r.language,
    kerangka: r.framework,
    pengembang: r.developer,
    kepemilikan: kepemilikanOf(r.developer),
    operasional: r.operasional,
    period: r.period,
    raa1: r.raa1,
    raa2: r.raa2,
    layanan: r.layanan,
    probis: (r.probis as { id: string; name: string; sasaran: string | null; iku: string | null }[]).map((p) => ({ id: p.id, name: p.name, sasaran: p.sasaran ?? undefined, iku: p.iku ?? undefined })),
    data: r.data,
    supplier: r.supplier,
    customer: r.customer,
    cloud: r.cloud,
    server: r.server,
    splp: r.splp,
    jip: r.jip,
  }));
  return { rows: mapped, sample: rows.some((r) => r.is_sample) };
}

/** Bacaan ber-cache (dibagi semua request, dibuang saat CMS menyimpan). */
export const listApprovedAplikasi = cached(loadListApprovedAplikasi, "aplikasi/repo:listApprovedAplikasi", [TAGS.content]);
