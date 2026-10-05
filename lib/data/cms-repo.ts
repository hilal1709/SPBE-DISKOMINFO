import type { PoolClient } from "pg";
import type { Actor } from "@/lib/access";
import { getDb } from "@/lib/db";
import { pdByCode } from "@/lib/probis/reference";
import type { DataRecord, ProbisReview, SubmissionStatus } from "@/lib/types";
import type { DataValues } from "./schema";

/** Akses data CMS Domain Data (server saja). Pola sama dengan lib/layanan/cms-repo.ts. */

function db() {
  const pool = getDb();
  if (!pool) throw new Error("Database belum dikonfigurasi (DATABASE_URL).");
  return pool;
}

async function tx<T>(run: (client: PoolClient) => Promise<T>) {
  const client = await db().connect();
  try {
    await client.query("begin");
    const result = await run(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

// rad_id menunjuk node terdalam (L3, atau L2 tanpa turunan); L1–L3 diturunkan dari induknya.
const SELECT = `
  select d.id, d.code, d.name, d.description, d.purpose, o.code as opd_code, o.name as opd_name, o.id as opd_id,
         coalesce(po.code, d.producer) as producer, d.output_info, d.input_info, d.sifat, d.jenis, d.validitas, d.interoperable,
         ap.name as period, d.status::text as status, d.security, d.rad_l4, d.rad_l5, d.updated_at, d.is_sample, d.rad_review,
         case when n.level = 3 then p2.code else p1.code end as rad1,
         case when n.level = 3 then p1.code else n.code end as rad2,
         case when n.level = 3 then n.code end as rad3,
         coalesce((select json_agg(json_build_object('id', pb.code, 'name', pb.name) order by pb.code)
                   from dataset_process_businesses dp join process_businesses pb on pb.id = dp.process_business_id
                   where dp.dataset_id = d.id), '[]') as probis,
         coalesce((select json_agg(json_build_object('id', s.code, 'name', s.name) order by s.code)
                   from dataset_services ds join services s on s.id = ds.service_id
                   where ds.dataset_id = d.id), '[]') as layanan
  from datasets d
  join opd o on o.id = d.opd_id
  left join opd po on po.id = d.producer_opd_id
  join architecture_periods ap on ap.id = d.period_id
  left join rad_references n on n.id = d.rad_id
  left join rad_references p1 on p1.id = n.parent_id
  left join rad_references p2 on p2.id = p1.parent_id`;

type Link = { id: string; name: string };
type Row = Record<string, string | null> & {
  updated_at: Date;
  is_sample: boolean;
  rad_review: boolean;
  interoperable: boolean;
  security: Record<string, string[]>;
  probis: Link[];
  layanan: Link[];
};

const toRecord = (r: Row): DataRecord => ({
  id: r.id!,
  code: r.code!,
  name: r.name!,
  uraian: r.description ?? "",
  tujuan: r.purpose ?? "",
  opdId: r.opd_id!,
  opdCode: r.opd_code!,
  opdName: r.opd_name!,
  produsen: r.producer,
  output: r.output_info,
  input: r.input_info,
  sifat: r.sifat as DataRecord["sifat"],
  jenis: r.jenis as DataRecord["jenis"],
  validitas: r.validitas!,
  interoperabel: r.interoperable,
  period: r.period ?? "",
  status: r.status as SubmissionStatus,
  rad1: r.rad1,
  rad2: r.rad2,
  rad3: r.rad3,
  radL4: r.rad_l4,
  radL5: r.rad_l5,
  security: r.security ?? {},
  probis: r.probis,
  layanan: r.layanan,
  updatedAt: r.updated_at.toISOString(),
  isSample: r.is_sample,
  radReview: r.rad_review,
});

/** Daftar data sesuai cakupan: operator hanya OPD-nya; `statuses` opsional. */
export async function listData({ opdId, statuses }: { opdId?: string | null; statuses?: readonly string[] } = {}) {
  const where: string[] = [];
  const params: unknown[] = [];
  if (opdId) where.push(`d.opd_id = $${params.push(opdId)}`);
  if (statuses?.length) where.push(`d.status::text = any($${params.push(statuses)})`);
  const { rows } = await db().query<Row>(`${SELECT} ${where.length ? `where ${where.join(" and ")}` : ""} order by d.updated_at desc`, params);
  return rows.map(toRecord);
}

export async function getData(id: string) {
  const { rows } = await db().query<Row>(`${SELECT} where d.id = $1`, [id]);
  return rows[0] ? toRecord(rows[0]) : null;
}

export async function getReviews(id: string): Promise<ProbisReview[]> {
  const { rows } = await db().query(
    "select id, coalesce(actor_name, 'Sistem') as actor_name, from_status::text, to_status::text, note, created_at from validation_history where dataset_id = $1 order by created_at desc",
    [id],
  );
  return rows.map((r) => ({ id: r.id, actorName: r.actor_name, fromStatus: r.from_status, toStatus: r.to_status, note: r.note, createdAt: r.created_at.toISOString() }));
}

/** Ringkasan beranda CMS untuk data dalam cakupan pengguna. */
export async function dataSummary(opdId: string | null) {
  const scope = opdId ? "where d.opd_id = $1" : "";
  const params = opdId ? [opdId] : [];
  const [counts, flags, recent] = await Promise.all([
    db().query(`select d.status::text as status, count(*)::int as n from datasets d ${scope} group by 1`, params),
    db().query(`select count(*) filter (where d.is_sample)::int as samples, count(*) filter (where d.rad_review)::int as review from datasets d ${scope}`, params),
    db().query(
      `select vh.id, vh.actor_name, vh.to_status::text, vh.note, vh.created_at, d.name
       from validation_history vh join datasets d on d.id = vh.dataset_id ${scope}
       order by vh.created_at desc limit 8`,
      params,
    ),
  ]);
  return {
    samples: flags.rows[0].samples as number,
    review: flags.rows[0].review as number,
    counts: Object.fromEntries(counts.rows.map((r) => [r.status, r.n])) as Partial<Record<SubmissionStatus, number>>,
    recent: recent.rows.map((r) => ({
      id: r.id as string,
      name: r.name as string,
      actorName: r.actor_name as string | null,
      toStatus: r.to_status as SubmissionStatus,
      note: r.note as string | null,
      createdAt: (r.created_at as Date).toISOString(),
    })),
  };
}

/** Pilihan dependensi pada satu periode: probis milik OPD wali data, dan seluruh layanan periode itu. */
export async function dependencyOptions(opd: string, period: string) {
  const [probis, layanan] = await Promise.all([
    db().query(
      `select pb.code, pb.name from process_businesses pb join opd o on o.id = pb.opd_id join architecture_periods ap on ap.id = pb.period_id
       where o.code = $1 and ap.name = $2 order by pb.code`,
      [opd, period],
    ),
    db().query(
      `select s.code, s.name, o.code as opd from services s join opd o on o.id = s.opd_id join architecture_periods ap on ap.id = s.period_id
       where ap.name = $1 order by (o.code = $2) desc, s.code`,
      [period, opd],
    ),
  ]);
  return {
    probis: probis.rows.map((r) => ({ code: r.code as string, name: r.name as string })),
    layanan: layanan.rows.map((r) => ({ code: r.code as string, name: r.name as string, opd: r.opd as string })),
  };
}

async function ids(client: PoolClient, v: Pick<DataValues, "opd" | "period" | "rad" | "probis" | "layanan" | "produsen">) {
  const { rows } = await client.query(
    `select (select id from opd where code = $1) as opd_id,
            (select id from architecture_periods where name = $2) as period_id,
            (select r.id from rad_references r join architecture_periods ap on ap.rad_version_id = r.version_id
              where ap.name = $2 and r.code = $3 and r.level in (2, 3)) as rad_id,
            (select id from opd where code = $4) as producer_opd_id`,
    [v.opd, v.period, v.rad, v.produsen ?? ""],
  );
  const found = rows[0];
  if (!found.opd_id) throw new Error("Perangkat Daerah wali data tidak ditemukan.");
  if (!found.period_id) throw new Error(`Periode “${v.period}” belum terdaftar. Tambahkan di Pengaturan › Periode Arsitektur.`);
  if (!found.rad_id) throw new Error(`RAD ${v.rad} tidak ada di versi RAD periode ${v.period}.`);
  // Dependensi harus berada di periode yang sama.
  const [probis, layanan] = await Promise.all([
    v.probis.length ? client.query("select id, code from process_businesses where period_id = $1 and code = any($2)", [found.period_id, v.probis]) : { rows: [] },
    v.layanan.length ? client.query("select id, code from services where period_id = $1 and code = any($2)", [found.period_id, v.layanan]) : { rows: [] },
  ]);
  const missing = (codes: string[], rows: { code: string }[]) => codes.filter((code) => !rows.some((r) => r.code === code));
  const noProbis = missing(v.probis, probis.rows);
  if (noProbis.length) throw new Error(`Proses bisnis ${noProbis.slice(0, 3).join(", ")} tidak ada di periode ${v.period}.`);
  const noLayanan = missing(v.layanan, layanan.rows);
  if (noLayanan.length) throw new Error(`Layanan ${noLayanan.slice(0, 3).join(", ")} tidak ada di periode ${v.period}.`);
  return {
    opd_id: found.opd_id as string,
    period_id: found.period_id as string,
    rad_id: found.rad_id as string,
    producer_opd_id: found.producer_opd_id as string | null,
    probis: probis.rows.map((p) => p.id as string),
    layanan: layanan.rows.map((s) => s.id as string),
  };
}

/** ID data otomatis: GSK-DAT {kode RAD tanpa "RAD."}.{urutan}. */
async function nextCode(client: PoolClient, rad: string) {
  const prefix = `GSK-DAT ${rad.slice(4)}.`;
  const { rows } = await client.query("select code from datasets where code like $1", [`${prefix}%`]);
  const max = rows.reduce((m, r) => Math.max(m, Number(String(r.code).slice(prefix.length)) || 0), 0);
  return `${prefix}${String(max + 1).padStart(2, "0")}`;
}

async function review(client: PoolClient, id: string, actor: Actor, from: SubmissionStatus | null, to: SubmissionStatus, note?: string | null) {
  await client.query("insert into validation_history (dataset_id, actor_id, actor_name, from_status, to_status, note) values ($1,$2,$3,$4,$5,$6)", [
    id,
    actor.id,
    actor.name,
    from,
    to,
    note ?? null,
  ]);
}

/** Tautkan isian RAD L4/L5 ke referensi bila kodenya terdaftar di bawah induknya (selain itu tetap teks bebas). */
async function linkDeep(client: PoolClient, id: string) {
  await client.query("update datasets d set rad4_id = (select r.id from rad_references r where r.code = d.rad_l4 and r.level = 4 and r.parent_id = d.rad_id) where d.id = $1", [id]);
  await client.query("update datasets d set rad5_id = (select r.id from rad_references r where r.code = d.rad_l5 and r.level = 5 and r.parent_id = d.rad4_id) where d.id = $1", [id]);
}

async function linkDependencies(client: PoolClient, id: string, probis: string[], layanan: string[]) {
  await client.query("delete from dataset_process_businesses where dataset_id = $1", [id]);
  await client.query("delete from dataset_services where dataset_id = $1", [id]);
  if (probis.length) await client.query("insert into dataset_process_businesses (dataset_id, process_business_id) select $1, unnest($2::uuid[])", [id, probis]);
  if (layanan.length) await client.query("insert into dataset_services (dataset_id, service_id) select $1, unnest($2::uuid[])", [id, layanan]);
}

/** Kolom isian (urutan sama dengan $2…$14 di INSERT/UPDATE). Produsen PD disimpan sebagai id, instansi lain sebagai teks. */
const columns = (v: DataValues, ref: { producer_opd_id: string | null }) => [
  v.name,
  v.uraian,
  v.tujuan,
  ref.producer_opd_id ? null : v.produsen && !pdByCode.has(v.produsen) ? v.produsen : null,
  v.output,
  v.input,
  v.sifat,
  v.jenis,
  v.validitas,
  v.interoperabel,
  v.radL4,
  v.radL5,
  JSON.stringify(v.security),
];

async function insert(client: PoolClient, v: DataValues, actor: Actor, status: SubmissionStatus, code?: string) {
  const ref = await ids(client, v);
  const finalCode = code || (await nextCode(client, v.rad));
  const { rows } = await client.query(
    `insert into datasets (code, name, description, purpose, producer, output_info, input_info, sifat, jenis, validitas, interoperable, rad_l4, rad_l5, security,
       opd_id, producer_opd_id, period_id, rad_id, status, created_by, submitted_by)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21) returning id`,
    [finalCode, ...columns(v, ref), ref.opd_id, ref.producer_opd_id, ref.period_id, ref.rad_id, status, actor.id, status === "submitted" ? actor.id : null],
  );
  const id = rows[0].id as string;
  await linkDeep(client, id);
  await linkDependencies(client, id, ref.probis, ref.layanan);
  await review(client, id, actor, null, status, status === "submitted" ? "Diajukan" : "Draf dibuat");
  return id;
}

const UPDATE = `update datasets set name=$2, description=$3, purpose=$4, producer=$5, output_info=$6, input_info=$7, sifat=$8, jenis=$9, validitas=$10,
  interoperable=$11, rad_l4=$12, rad_l5=$13, security=$14, opd_id=$15, producer_opd_id=$16, period_id=$17, rad_id=$18, rad_review = false, updated_at = now()`;

export function createData(v: DataValues, actor: Actor, submit: boolean) {
  return tx((client) => insert(client, v, actor, submit ? "submitted" : "draft"));
}

export function updateData(id: string, v: DataValues, actor: Actor, submit: boolean) {
  return tx(async (client) => {
    const ref = await ids(client, v);
    const { rows } = await client.query("select status::text from datasets where id = $1 for update", [id]);
    const from = rows[0]?.status as SubmissionStatus | undefined;
    if (!from) throw new Error("Data tidak ditemukan.");
    const to: SubmissionStatus = submit ? "submitted" : from;
    await client.query(
      `${UPDATE}, status = $19::text::submission_status, submitted_by = case when $19::text = 'submitted' then $20::uuid else submitted_by end where id = $1`,
      [id, ...columns(v, ref), ref.opd_id, ref.producer_opd_id, ref.period_id, ref.rad_id, to, actor.id],
    );
    await linkDeep(client, id);
    await linkDependencies(client, id, ref.probis, ref.layanan);
    if (to !== from) await review(client, id, actor, from, to, "Diajukan");
    return id;
  });
}

export async function deleteData(id: string) {
  await db().query("delete from datasets where id = $1", [id]);
}

/** Ubah status alur verifikasi dan catat riwayatnya (kunci optimis pada status asal). */
export function transition(id: string, from: SubmissionStatus, to: SubmissionStatus, actor: Actor, note?: string | null) {
  return tx(async (client) => {
    const who = to === "verified" ? "verified_by = $4" : to === "approved" ? "approved_by = $4, approved_at = now()" : to === "submitted" ? "submitted_by = $4" : null;
    const { rowCount } = await client.query(
      `update datasets set status = $3, updated_at = now() ${who ? `, ${who}` : ""} where id = $1 and status::text = $2`,
      who ? [id, from, to, actor.id] : [id, from, to],
    );
    if (!rowCount) throw new Error("Status data sudah berubah. Muat ulang halaman.");
    await review(client, id, actor, from, to, note);
  });
}

/** Simpan hasil impor dalam satu transaksi. Baris ber-ID yang sudah ada diperbarui bila `update` aktif. */
export function importRows(rows: (DataValues & { code?: string | null })[], actor: Actor, status: SubmissionStatus, update: boolean) {
  return tx(async (client) => {
    let created = 0,
      updated = 0,
      skipped = 0;
    const codes = rows.map((r) => r.code).filter((c): c is string => !!c);
    const found = codes.length
      ? (await client.query("select d.id, d.status::text, d.code, ap.name as period from datasets d join architecture_periods ap on ap.id = d.period_id where d.code = any($1)", [codes])).rows
      : [];
    const byKey = new Map(found.map((r) => [`${r.code}|${r.period}`, r as { id: string; status: SubmissionStatus }]));
    for (const row of rows) {
      const existing = row.code ? byKey.get(`${row.code}|${row.period}`) : undefined;
      if (existing) {
        if (!update) {
          skipped++;
          continue;
        }
        const ref = await ids(client, row);
        await client.query(`${UPDATE} where id = $1`, [existing.id, ...columns(row, ref), ref.opd_id, ref.producer_opd_id, ref.period_id, ref.rad_id]);
        await linkDeep(client, existing.id);
        await linkDependencies(client, existing.id, ref.probis, ref.layanan);
        await review(client, existing.id, actor, existing.status, existing.status, "Diperbarui lewat impor");
        updated++;
      } else {
        await insert(client, row, actor, status, row.code ?? undefined);
        created++;
      }
    }
    return { created, updated, skipped };
  });
}

/** Pasangan "ID|periode" yang sudah ada (untuk pratinjau impor; ID unik per periode). */
export async function existingCodes(codes: string[]) {
  if (!codes.length) return new Set<string>();
  const { rows } = await db().query("select d.code, ap.name as period from datasets d join architecture_periods ap on ap.id = d.period_id where d.code = any($1)", [codes]);
  return new Set(rows.map((r) => `${r.code}|${r.period}`));
}

/** Hapus seluruh data contoh. */
export async function clearSamples() {
  const { rowCount } = await db().query("delete from datasets where is_sample");
  return rowCount ?? 0;
}
