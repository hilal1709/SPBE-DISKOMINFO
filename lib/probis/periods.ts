import { cached, TAGS } from "@/lib/cache";
import { getDb } from "@/lib/db";
import { sampleActivePeriod, samplePeriods, type PeriodOptions } from "./reference";

/** Periode arsitektur (versioning tiap 2–5 tahun mengikuti perubahan SOTK — notulen). Server saja. */
export type Period = {
  id: string;
  name: string;
  start: number;
  end: number;
  active: boolean;
  /** Jumlah proses bisnis. */
  count: number;
  /** Jumlah layanan. */
  services: number;
  /** Versi RAB (probis). */
  versionId: string | null;
  versionName: string | null;
  /** Versi RAL (layanan). */
  ralVersionId: string | null;
  ralVersionName: string | null;
  /** Jumlah data & versi RAD (data). */
  datasets: number;
  radVersionId: string | null;
  radVersionName: string | null;
  /** Jumlah aplikasi & versi RAA (aplikasi). */
  applications: number;
  raaVersionId: string | null;
  raaVersionName: string | null;
  /** Jumlah komponen infrastruktur & versi RAI. */
  infrastructures: number;
  raiVersionId: string | null;
  raiVersionName: string | null;
};

export const MIN_SPAN = 2;
export const MAX_SPAN = 5;

function db() {
  const pool = getDb();
  if (!pool) throw new Error("Database belum dikonfigurasi (DATABASE_URL).");
  return pool;
}

export async function listPeriods(): Promise<Period[]> {
  const { rows } = await db().query(
    `select ap.id, ap.name, ap.start_year, ap.end_year, coalesce(ap.is_active, false) as active,
            (select count(*)::int from process_businesses pb where pb.period_id = ap.id) as n,
            (select count(*)::int from services s where s.period_id = ap.id) as services,
            (select count(*)::int from datasets d where d.period_id = ap.id) as datasets,
            (select count(*)::int from applications a where a.period_id = ap.id) as applications,
            (select count(*)::int from infrastructures i where i.period_id = ap.id) as infrastructures,
            ap.rab_version_id, v.name as version_name, ap.ral_version_id, rv.name as ral_version_name, ap.rad_version_id, dv.name as rad_version_name,
            ap.raa_version_id, av.name as raa_version_name, ap.rai_version_id, iv.name as rai_version_name
     from architecture_periods ap
     left join rab_versions v on v.id = ap.rab_version_id
     left join ral_versions rv on rv.id = ap.ral_version_id
     left join rad_versions dv on dv.id = ap.rad_version_id
     left join raa_versions av on av.id = ap.raa_version_id
     left join rai_versions iv on iv.id = ap.rai_version_id
     order by ap.start_year`,
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    start: r.start_year,
    end: r.end_year,
    active: r.active,
    count: r.n,
    services: r.services,
    versionId: r.rab_version_id,
    versionName: r.version_name,
    ralVersionId: r.ral_version_id,
    ralVersionName: r.ral_version_name,
    datasets: r.datasets,
    radVersionId: r.rad_version_id,
    radVersionName: r.rad_version_name,
    applications: r.applications,
    raaVersionId: r.raa_version_id,
    raaVersionName: r.raa_version_name,
    infrastructures: r.infrastructures,
    raiVersionId: r.rai_version_id,
    raiVersionName: r.rai_version_name,
  }));
}

/** Nama periode + periode aktif saja (tanpa hitungan isian), dibagi semua request. */
const loadPeriodOptions = cached(
  async (): Promise<PeriodOptions | null> => {
    const { rows } = await db().query<{ name: string; active: boolean }>("select name, coalesce(is_active, false) as active from architecture_periods order by start_year");
    return rows.length ? { periods: rows.map((p) => p.name), active: (rows.find((p) => p.active) ?? rows.at(-1)!).name } : null;
  },
  "period-options",
  [TAGS.reference],
);

/** Daftar nama periode + periode aktif. Bila database belum tersedia, pakai periode data contoh. */
export async function periodOptions(): Promise<PeriodOptions> {
  try {
    const options = await loadPeriodOptions();
    if (options) return options;
  } catch {
    // Database tidak tersedia: lanjut ke periode contoh.
  }
  return { periods: samplePeriods, active: sampleActivePeriod };
}

export async function createPeriod(start: number, end: number) {
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 2000 || end > 2100) throw new Error("Tahun tidak valid.");
  const span = end - start + 1;
  if (span < MIN_SPAN || span > MAX_SPAN) throw new Error(`Rentang periode ${MIN_SPAN}–${MAX_SPAN} tahun (sekarang ${span} tahun).`);
  const overlap = await db().query("select name from architecture_periods where start_year <= $2 and end_year >= $1", [start, end]);
  if (overlap.rows.length) throw new Error(`Bertumpang tindih dengan periode ${overlap.rows.map((r) => r.name).join(", ")}.`);
  const name = `${start}–${end}`;
  // Periode baru memakai versi RAB, RAL, RAD, RAA, dan RAI terbit terbaru.
  await db().query(
    `insert into architecture_periods (name, start_year, end_year, is_active, rab_version_id, ral_version_id, rad_version_id, raa_version_id, rai_version_id)
     values ($1, $2, $3, false,
       (select id from rab_versions where status = 'published' order by published_at desc nulls last limit 1),
       (select id from ral_versions where status = 'published' order by published_at desc nulls last limit 1),
       (select id from rad_versions where status = 'published' order by published_at desc nulls last limit 1),
       (select id from raa_versions where status = 'published' order by published_at desc nulls last limit 1),
       (select id from rai_versions where status = 'published' order by published_at desc nulls last limit 1))`,
    [name, start, end],
  );
  return name;
}

export async function setActivePeriod(id: string) {
  const client = await db().connect();
  try {
    await client.query("begin");
    const { rowCount } = await client.query("update architecture_periods set is_active = (id = $1)", [id]);
    if (!rowCount) throw new Error("Periode tidak ditemukan.");
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function deletePeriod(id: string) {
  const { rows } = await db().query(
    `select ap.is_active,
            (select count(*)::int from process_businesses pb where pb.period_id = ap.id) as n,
            (select count(*)::int from services s where s.period_id = ap.id) as services,
            (select count(*)::int from datasets d where d.period_id = ap.id) as datasets,
            (select count(*)::int from applications a where a.period_id = ap.id) as applications,
            (select count(*)::int from infrastructures i where i.period_id = ap.id) as infrastructures,
            (select count(*)::int from security_activities sa where sa.period_id = ap.id) as security,
            (select count(*)::int from roadmap_items ri where ri.period_id = ap.id) as roadmap,
            (select count(*)::int from gap_analyses ga where ga.period_id = ap.id) as gaps
     from architecture_periods ap where ap.id = $1`,
    [id],
  );
  if (!rows[0]) throw new Error("Periode tidak ditemukan.");
  if (rows[0].is_active) throw new Error("Periode aktif tidak dapat dihapus. Aktifkan periode lain dulu.");
  if (rows[0].n > 0) throw new Error(`Periode masih dipakai ${rows[0].n} probis.`);
  if (rows[0].services > 0) throw new Error(`Periode masih dipakai ${rows[0].services} layanan.`);
  if (rows[0].datasets > 0) throw new Error(`Periode masih dipakai ${rows[0].datasets} data.`);
  if (rows[0].applications > 0) throw new Error(`Periode masih dipakai ${rows[0].applications} aplikasi.`);
  if (rows[0].infrastructures > 0) throw new Error(`Periode masih dipakai ${rows[0].infrastructures} komponen infrastruktur.`);
  if (rows[0].security > 0) throw new Error(`Periode masih dipakai ${rows[0].security} kegiatan keamanan.`);
  if (rows[0].roadmap > 0) throw new Error(`Periode masih dipakai ${rows[0].roadmap} kegiatan peta rencana.`);
  if (rows[0].gaps > 0) throw new Error(`Periode masih dipakai ${rows[0].gaps} temuan gap analysis.`);
  await db().query("delete from architecture_periods where id = $1", [id]);
}
