import type { PoolClient } from "pg";
import type { Actor } from "@/lib/access";
import { getDb } from "@/lib/db";
import type { Probis, ProbisRecord, ProbisReview, SubmissionStatus } from "@/lib/types";
import type { ProbisValues } from "./schema";

/** Akses data modul Proses Bisnis (server saja). */

function db() {
  const pool = getDb();
  if (!pool) throw new Error("Database belum dikonfigurasi (DATABASE_URL).");
  return pool;
}

const SELECT = `
  select pb.id, pb.code, pb.name, pb.description, o.code as opd_code, o.name as opd_name, o.id as opd_id,
         ap.name as period, pb.probis_status, pb.status::text as status,
         r1.code as rab1, r2.code as rab2, r3.code as rab3, r4.code as rab4, r5.code as rab5, pb.rab_l4, pb.rab_l5,
         pb.strategic_goal, pb.iku, pb.iku_target, pb.iku_realization, pb.updated_at, pb.is_sample, pb.rab_review
  from process_businesses pb
  join opd o on o.id = pb.opd_id
  left join architecture_periods ap on ap.id = pb.period_id
  left join rab_references r3 on r3.id = pb.rab_id
  left join rab_references r4 on r4.id = pb.rab4_id
  left join rab_references r5 on r5.id = pb.rab5_id
  left join rab_references r2 on r2.id = r3.parent_id
  left join rab_references r1 on r1.id = r2.parent_id`;

type Row = Record<string, string | null> & { updated_at: Date; is_sample: boolean; rab_review: boolean };

const toRecord = (r: Row): ProbisRecord => ({
  id: r.id!,
  code: r.code!,
  name: r.name!,
  description: r.description,
  opdId: r.opd_id!,
  opdCode: r.opd_code!,
  opdName: r.opd_name!,
  period: r.period ?? "",
  probisStatus: r.probis_status as ProbisRecord["probisStatus"],
  status: r.status as SubmissionStatus,
  rab1: r.rab1,
  rab2: r.rab2,
  rab3: r.rab3,
  rabL4: r.rab_l4,
  rabL5: r.rab_l5,
  strategicGoal: r.strategic_goal,
  iku: r.iku,
  ikuTarget: r.iku_target,
  ikuRealization: r.iku_realization,
  updatedAt: r.updated_at.toISOString(),
  isSample: r.is_sample,
  rabReview: r.rab_review,
});

/** Daftar probis sesuai cakupan: operator hanya OPD-nya; `statuses` opsional. */
export async function listProbis({ opdId, statuses }: { opdId?: string | null; statuses?: readonly string[] } = {}) {
  const where: string[] = [];
  const params: unknown[] = [];
  if (opdId) where.push(`pb.opd_id = $${params.push(opdId)}`);
  if (statuses?.length) where.push(`pb.status::text = any($${params.push(statuses)})`);
  const { rows } = await db().query<Row>(`${SELECT} ${where.length ? `where ${where.join(" and ")}` : ""} order by pb.updated_at desc`, params);
  return rows.map(toRecord);
}

export async function getProbis(id: string) {
  const { rows } = await db().query<Row>(`${SELECT} where pb.id = $1`, [id]);
  return rows[0] ? toRecord(rows[0]) : null;
}

export async function getReviews(id: string): Promise<ProbisReview[]> {
  const { rows } = await db().query(
    "select id, actor_name, from_status::text, to_status::text, note, created_at from probis_reviews where process_business_id = $1 order by created_at desc",
    [id],
  );
  return rows.map((r) => ({ id: r.id, actorName: r.actor_name, fromStatus: r.from_status, toStatus: r.to_status, note: r.note, createdAt: r.created_at.toISOString() }));
}

/** Probis yang sudah tervalidasi, dalam bentuk data dashboard publik. `sample` = masih berisi data contoh. */
export async function listApproved(): Promise<{ rows: Probis[]; sample: boolean }> {
  const { rows } = await db().query<Row>(`${SELECT} where pb.status = 'approved' and r3.code is not null`);
  const mapped = rows.map((r) => ({
    id: r.code!,
    name: r.name!,
    uraian: r.description ?? "",
    pd: r.opd_code!,
    status: r.probis_status as Probis["status"],
    period: r.period ?? "",
    sasaran: r.strategic_goal ?? "—",
    iku: r.iku ?? "—",
    rab1: r.rab1!,
    rab2: r.rab2!,
    rab3: r.rab3!,
    rab4: r.rab4,
    rab5: r.rab5,
  }));
  return { rows: mapped, sample: rows.some((r) => r.is_sample) };
}

/** Ringkasan beranda CMS: jumlah per status dan aktivitas terbaru dalam cakupan pengguna. */
export async function cmsSummary(opdId: string | null) {
  const scope = opdId ? "where pb.opd_id = $1" : "";
  const params = opdId ? [opdId] : [];
  const counts = await db().query(`select pb.status::text as status, count(*)::int as n from process_businesses pb ${scope} group by 1`, params);
  const recent = await db().query(
    `select pr.id, pr.actor_name, pr.from_status::text, pr.to_status::text, pr.note, pr.created_at, pb.id as probis_id, pb.name
     from probis_reviews pr join process_businesses pb on pb.id = pr.process_business_id ${scope}
     order by pr.created_at desc limit 8`,
    params,
  );
  const flags = await db().query(
    `select count(*) filter (where pb.is_sample)::int as samples, count(*) filter (where pb.rab_review)::int as review from process_businesses pb ${scope}`,
    params,
  );
  return {
    samples: flags.rows[0].samples as number,
    review: flags.rows[0].review as number,
    counts: Object.fromEntries(counts.rows.map((r) => [r.status, r.n])) as Partial<Record<SubmissionStatus, number>>,
    recent: recent.rows.map((r) => ({
      id: r.id as string,
      probisId: r.probis_id as string,
      name: r.name as string,
      actorName: r.actor_name as string | null,
      toStatus: r.to_status as SubmissionStatus,
      note: r.note as string | null,
      createdAt: (r.created_at as Date).toISOString(),
    })),
  };
}

async function ids(client: PoolClient, values: Pick<ProbisValues, "opd" | "period" | "rab3">) {
  const { rows } = await client.query(
    `select (select id from opd where code = $1) as opd_id,
            (select id from architecture_periods where name = $2) as period_id,
            (select r.id from rab_references r join architecture_periods ap on ap.rab_version_id = r.version_id
              where ap.name = $2 and r.code = $3 and r.level = 3) as rab_id`,
    [values.opd, values.period, values.rab3],
  );
  const found = rows[0];
  if (!found.opd_id) throw new Error("Perangkat Daerah tidak ditemukan.");
  if (!found.period_id) throw new Error(`Periode “${values.period}” belum terdaftar. Tambahkan di Pengaturan › Periode Arsitektur.`);
  if (!found.rab_id) throw new Error(`RAB Level 3 ${values.rab3} tidak ada di versi RAB periode ${values.period}.`);
  return found as { opd_id: string; period_id: string; rab_id: string };
}

/** ID probis otomatis: GSK-DAB {kode RAB L3 tanpa "RAB."}.{urutan}. */
async function nextCode(client: PoolClient, rab3: string) {
  const prefix = `GSK-DAB ${rab3.slice(4)}.`;
  const { rows } = await client.query("select code from process_businesses where code like $1", [`${prefix}%`]);
  const max = rows.reduce((m, r) => Math.max(m, Number(String(r.code).slice(prefix.length)) || 0), 0);
  return `${prefix}${String(max + 1).padStart(2, "0")}`;
}

async function review(client: PoolClient, id: string, actor: Actor, from: SubmissionStatus | null, to: SubmissionStatus, note?: string | null) {
  await client.query(
    "insert into probis_reviews (process_business_id, actor_id, actor_name, from_status, to_status, note) values ($1,$2,$3,$4,$5,$6)",
    [id, actor.id, actor.name, from, to, note ?? null],
  );
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

/** Tautkan isian RAB L4/L5 ke referensi bila kodenya terdaftar di bawah induknya (selain itu tetap teks bebas). */
export const LINK_DEEP_SQL = `
  update process_businesses pb set rab4_id = (select r.id from rab_references r where r.code = pb.rab_l4 and r.level = 4 and r.parent_id = pb.rab_id) where pb.id = any($1);
  update process_businesses pb set rab5_id = (select r.id from rab_references r where r.code = pb.rab_l5 and r.level = 5 and r.parent_id = pb.rab4_id) where pb.id = any($1);`;

async function linkDeep(client: PoolClient, ids: string[]) {
  for (const statement of LINK_DEEP_SQL.split(";").map((x) => x.trim()).filter(Boolean)) await client.query(statement, [ids]);
}

const columns = (v: ProbisValues) => [v.name, v.description, v.rabL4, v.rabL5, v.strategicGoal, v.iku, v.ikuTarget, v.ikuRealization, v.probisStatus];

async function insert(client: PoolClient, v: ProbisValues, actor: Actor, status: SubmissionStatus, code?: string) {
  const ref = await ids(client, v);
  const finalCode = code || (await nextCode(client, v.rab3));
  const { rows } = await client.query(
    `insert into process_businesses (code, name, description, rab_l4, rab_l5, strategic_goal, iku, iku_target, iku_realization, probis_status,
       opd_id, period_id, rab_id, status, created_by, submitted_by)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) returning id`,
    [finalCode, ...columns(v), ref.opd_id, ref.period_id, ref.rab_id, status, actor.id, status === "submitted" ? actor.id : null],
  );
  await linkDeep(client, [rows[0].id]);
  await review(client, rows[0].id, actor, null, status, status === "submitted" ? "Diajukan" : "Draf dibuat");
  return rows[0].id as string;
}

export function createProbis(v: ProbisValues, actor: Actor, submit: boolean) {
  return tx((client) => insert(client, v, actor, submit ? "submitted" : "draft"));
}

export function updateProbis(id: string, v: ProbisValues, actor: Actor, submit: boolean) {
  return tx(async (client) => {
    const ref = await ids(client, v);
    const { rows } = await client.query("select status::text from process_businesses where id = $1 for update", [id]);
    const from = rows[0]?.status as SubmissionStatus | undefined;
    if (!from) throw new Error("Probis tidak ditemukan.");
    const to: SubmissionStatus = submit ? "submitted" : from;
    await client.query(
      `update process_businesses set name=$2, description=$3, rab_l4=$4, rab_l5=$5, strategic_goal=$6, iku=$7, iku_target=$8, iku_realization=$9,
         probis_status=$10, opd_id=$11, period_id=$12, rab_id=$13, status=$14::text::submission_status, rab_review = false,
         submitted_by = case when $14::text = 'submitted' then $15::uuid else submitted_by end,
         updated_at = now()
       where id = $1`,
      [id, ...columns(v), ref.opd_id, ref.period_id, ref.rab_id, to, actor.id],
    );
    await linkDeep(client, [id]);
    if (to !== from) await review(client, id, actor, from, to, "Diajukan");
    return id;
  });
}

export async function deleteProbis(id: string) {
  await db().query("delete from process_businesses where id = $1", [id]);
}

/** Ubah status alur verifikasi dan catat riwayatnya. */
export function transition(id: string, from: SubmissionStatus, to: SubmissionStatus, actor: Actor, note?: string | null) {
  return tx(async (client) => {
    const who = to === "verified" ? "verified_by" : to === "approved" ? "approved_by" : to === "submitted" ? "submitted_by" : null;
    const { rowCount } = await client.query(
      `update process_businesses set status = $3, updated_at = now() ${who ? `, ${who} = $4` : ""} where id = $1 and status::text = $2`,
      who ? [id, from, to, actor.id] : [id, from, to],
    );
    if (!rowCount) throw new Error("Status probis sudah berubah. Muat ulang halaman.");
    await review(client, id, actor, from, to, note);
  });
}

/** Simpan hasil impor dalam satu transaksi. Baris ber-ID yang sudah ada diperbarui bila `update` aktif. */
export function importRows(rows: (ProbisValues & { code?: string | null })[], actor: Actor, status: SubmissionStatus, update: boolean) {
  return tx(async (client) => {
    let created = 0, updated = 0, skipped = 0;
    for (const row of rows) {
      const existing = row.code
        ? (await client.query(
            "select pb.id, pb.status::text from process_businesses pb join architecture_periods ap on ap.id = pb.period_id where pb.code = $1 and ap.name = $2",
            [row.code, row.period],
          )).rows[0]
        : undefined;
      if (existing) {
        if (!update) {
          skipped++;
          continue;
        }
        const ref = await ids(client, row);
        await client.query(
          `update process_businesses set name=$2, description=$3, rab_l4=$4, rab_l5=$5, strategic_goal=$6, iku=$7, iku_target=$8, iku_realization=$9,
             probis_status=$10, opd_id=$11, period_id=$12, rab_id=$13, rab_review = false, updated_at = now() where id = $1`,
          [existing.id, ...columns(row), ref.opd_id, ref.period_id, ref.rab_id],
        );
        await linkDeep(client, [existing.id]);
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
  const { rows } = await db().query(
    "select pb.code, ap.name as period from process_businesses pb join architecture_periods ap on ap.id = pb.period_id where pb.code = any($1)",
    [codes],
  );
  return new Set(rows.map((r) => `${r.code}|${r.period}`));
}

/** Hapus seluruh data contoh. */
export async function clearSamples() {
  const { rowCount } = await db().query("delete from process_businesses where is_sample");
  return rowCount ?? 0;
}

/** opd.id untuk kode OPD (dipakai cek hak akses operator). */
export async function opdIdOf(code: string) {
  const { rows } = await db().query("select id from opd where code = $1", [code]);
  return (rows[0]?.id as string | undefined) ?? null;
}

export async function opdCodeOf(id: string) {
  const { rows } = await db().query("select code from opd where id = $1", [id]);
  return (rows[0]?.code as string | undefined) ?? null;
}
