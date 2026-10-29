import { randomUUID } from "node:crypto";
import { assertImportUpdate, assertStillEditable, importStatus, importUpdateStatus } from "@/lib/cms/guards";
import type { PoolClient } from "pg";
import type { Actor } from "@/lib/access";
import { cached, TAGS } from "@/lib/cache";
import { codeSequence, insertMany } from "@/lib/cms/batch";
import { getDb } from "@/lib/db";
import { pack, type Packed } from "@/lib/pack";
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

export type ProbisTab = "all" | "review" | SubmissionStatus;
export type ProbisPageQuery = {
  opdId: string | null;
  tab: ProbisTab;
  pd: string[];
  rab1: string[];
  /** Nama periode, atau "__all". */
  period: string;
  q: string;
  /** Halaman, mulai 0. */
  page: number;
  pageSize: number;
  sort: { key: string; dir: 1 | -1 } | null;
};

/** Kolom yang boleh dipakai mengurutkan tabel CMS (kunci = `sortKey` kolom di components/cms/probis-table.tsx). */
const PROBIS_SORT: Record<string, string> = {
  status: "pb.status",
  code: "pb.code",
  name: "pb.name",
  opd: "o.name",
  rab3: "r3.code",
  probisStatus: "pb.probis_status",
  rab1: "r1.code",
  rab2: "r2.code",
  rabL4: "pb.rab_l4",
  rabL5: "pb.rab_l5",
  period: "ap.name",
};

/**
 * Satu halaman tabel probis CMS beserta jumlah per tab status, dihitung di database (bukan seluruh probis
 * dikirim ke browser). Dua query berjalan bersamaan; hasilnya di-cache per kombinasi filter.
 */
async function loadProbisPage(query: ProbisPageQuery) {
  const where: string[] = [];
  const params: unknown[] = [];
  if (query.opdId) where.push(`pb.opd_id = $${params.push(query.opdId)}`);
  if (query.pd.length) where.push(`o.code = any($${params.push(query.pd)})`);
  if (query.rab1.length) where.push(`r1.code = any($${params.push(query.rab1)})`);
  if (query.period !== "__all") where.push(`ap.name = $${params.push(query.period)}`);
  const q = query.q.trim();
  if (q) where.push(`(pb.code ilike $${params.push(`%${q}%`)} or pb.name ilike $${params.length} or o.name ilike $${params.length})`);
  const scoped = where.length ? `where ${where.join(" and ")}` : "";

  const tabWhere = query.tab === "all" ? "" : query.tab === "review" ? "pb.rab_review" : `pb.status::text = $${params.length + 1}`;
  const pageParams = query.tab === "all" || query.tab === "review" ? [...params] : [...params, query.tab];
  const filter = [scoped, tabWhere && (scoped ? `and ${tabWhere}` : `where ${tabWhere}`)].join(" ");
  const column = (query.sort && PROBIS_SORT[query.sort.key]) || null;
  const order = column ? `${column} ${query.sort!.dir === 1 ? "asc" : "desc"} nulls last, pb.id` : "pb.updated_at desc, pb.id";

  const [rows, counts] = await Promise.all([
    db().query<Row>(`${SELECT} ${filter} order by ${order} limit ${query.pageSize} offset ${query.page * query.pageSize}`, pageParams),
    db().query(
      `select count(*)::int as "all", count(*) filter (where pb.rab_review)::int as review,
              count(*) filter (where pb.status = 'draft')::int as draft, count(*) filter (where pb.status = 'submitted')::int as submitted,
              count(*) filter (where pb.status = 'verified')::int as verified, count(*) filter (where pb.status = 'approved')::int as approved,
              count(*) filter (where pb.status = 'rejected')::int as rejected
       from process_businesses pb
       join opd o on o.id = pb.opd_id
       left join architecture_periods ap on ap.id = pb.period_id
       left join rab_references r3 on r3.id = pb.rab_id
       left join rab_references r2 on r2.id = r3.parent_id
       left join rab_references r1 on r1.id = r2.parent_id
       ${scoped}`,
      params,
    ),
  ]);
  const tabCounts = counts.rows[0] as Record<ProbisTab, number>;
  return { rows: rows.rows.map(toRecord), counts: tabCounts, total: tabCounts[query.tab] ?? 0 };
}

export const probisPage = cached(loadProbisPage, "probis/repo:probisPage", [TAGS.content]);

/** Ada probis sama sekali dalam cakupan pengguna (untuk keadaan kosong tabel CMS). */
export const hasProbis = cached(
  async (opdId: string | null) => (await db().query(`select exists (select 1 from process_businesses ${opdId ? "where opd_id = $1" : ""}) as found`, opdId ? [opdId] : [])).rows[0].found as boolean,
  "probis/repo:hasProbis",
  [TAGS.content],
);

/** Probis yang sudah tervalidasi, dikemas ringkas untuk dashboard publik. `sample` = masih berisi data contoh. */
export const listApproved = cached(
  async (): Promise<{ rows: Packed<Probis>; sample: boolean }> => {
    const { rows, sample } = await loadApproved();
    return { rows: pack(rows), sample };
  },
  "probis/repo:listApproved",
  [TAGS.content],
);

async function loadApproved(): Promise<{ rows: Probis[]; sample: boolean }> {
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
async function loadCmsSummary(opdId: string | null) {
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
    assertStillEditable(actor, from);
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

/** OPD, periode, dan RAB L3 untuk semua baris impor dalam satu query; galat sama dengan `ids` untuk baris pertama yang gagal. */
async function idsMany(client: PoolClient, rows: Pick<ProbisValues, "opd" | "period" | "rab3">[]) {
  const { rows: found } = await client.query(
    `select t.opd, t.period, t.rab3,
            (select id from opd where code = t.opd) as opd_id,
            (select id from architecture_periods where name = t.period) as period_id,
            (select r.id from rab_references r join architecture_periods ap on ap.rab_version_id = r.version_id
              where ap.name = t.period and r.code = t.rab3 and r.level = 3) as rab_id
     from (select distinct * from unnest($1::text[], $2::text[], $3::text[])) t(opd, period, rab3)`,
    [rows.map((r) => r.opd), rows.map((r) => r.period), rows.map((r) => r.rab3)],
  );
  const byKey = new Map(found.map((f) => [`${f.opd}|${f.period}|${f.rab3}`, f]));
  // Diperiksa saat baris dipakai: baris yang dilewati (sudah ada, tanpa pembaruan) tidak menggagalkan impor.
  return (values: Pick<ProbisValues, "opd" | "period" | "rab3">) => {
    const ref = byKey.get(`${values.opd}|${values.period}|${values.rab3}`);
    if (!ref?.opd_id) throw new Error("Perangkat Daerah tidak ditemukan.");
    if (!ref.period_id) throw new Error(`Periode “${values.period}” belum terdaftar. Tambahkan di Pengaturan › Periode Arsitektur.`);
    if (!ref.rab_id) throw new Error(`RAB Level 3 ${values.rab3} tidak ada di versi RAB periode ${values.period}.`);
    return ref as { opd_id: string; period_id: string; rab_id: string };
  };
}

const INSERT_COLUMNS = ["id", "code", "name", "description", "rab_l4", "rab_l5", "strategic_goal", "iku", "iku_target", "iku_realization", "probis_status", "opd_id", "period_id", "rab_id", "status", "created_by", "submitted_by"];
const REVIEW_COLUMNS = ["process_business_id", "actor_id", "actor_name", "from_status", "to_status", "note"];

/**
 * Simpan hasil impor dalam satu transaksi. Baris ber-ID yang sudah ada diperbarui bila `update` aktif.
 * Lookup, kode baru, baris baru, riwayat, dan penautan L4/L5 dikirim sekaligus, bukan per baris.
 */
export function importRows(rows: (ProbisValues & { code?: string | null })[], actor: Actor, status: SubmissionStatus, update: boolean) {
  importStatus(status);
  return tx(async (client) => {
    let created = 0, updated = 0, skipped = 0;
    const codes = rows.map((r) => r.code).filter((c): c is string => !!c);
    const found = codes.length
      ? (await client.query("select pb.id, pb.code, pb.status::text, pb.opd_id, ap.name as period from process_businesses pb join architecture_periods ap on ap.id = pb.period_id where pb.code = any($1)", [codes])).rows
      : [];
    const byKey = new Map(found.map((r) => [`${r.code}|${r.period}`, r as { id: string; code: string; status: SubmissionStatus; opd_id: string | null }]));
    const refOf = await idsMany(client, rows);
    const next = codeSequence(client, "process_businesses", codes);
    const prefixOf = (row: ProbisValues) => `GSK-DAB ${row.rab3.slice(4)}.`;
    await next.preload(rows.filter((r) => !r.code).map(prefixOf));
    const inserts: unknown[][] = [];
    const reviews: unknown[][] = [];
    const touched: string[] = [];
    for (const row of rows) {
      const existing = row.code ? byKey.get(`${row.code}|${row.period}`) : undefined;
      if (existing && !update) {
        skipped++;
        continue;
      }
      const ref = refOf(row);
      if (existing) {
        assertImportUpdate(actor, existing);
        const to = importUpdateStatus(existing.status, status);
        await client.query(
          `update process_businesses set name=$2, description=$3, rab_l4=$4, rab_l5=$5, strategic_goal=$6, iku=$7, iku_target=$8, iku_realization=$9,
             probis_status=$10, opd_id=$11, period_id=$12, rab_id=$13, rab_review = false, updated_at = now(),
             status=$14::text::submission_status, submitted_by=case when $14::text = 'submitted' then $15::uuid else submitted_by end where id = $1`,
          [existing.id, ...columns(row), ref.opd_id, ref.period_id, ref.rab_id, to, actor.id],
        );
        touched.push(existing.id);
        reviews.push([existing.id, actor.id, actor.name, existing.status, to, to !== existing.status ? "Diajukan lewat impor" : "Diperbarui lewat impor"]);
        updated++;
      } else {
        const id = randomUUID();
        const code = row.code || (await next(prefixOf(row)));
        inserts.push([id, code, ...columns(row), ref.opd_id, ref.period_id, ref.rab_id, status, actor.id, status === "submitted" ? actor.id : null]);
        touched.push(id);
        reviews.push([id, actor.id, actor.name, null, status, status === "submitted" ? "Diajukan" : "Draf dibuat"]);
        created++;
      }
    }
    await insertMany(client, "process_businesses", INSERT_COLUMNS, inserts);
    if (touched.length) await linkDeep(client, touched);
    await insertMany(client, "probis_reviews", REVIEW_COLUMNS, reviews);
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

async function loadOpdCodeOf(id: string) {
  const { rows } = await db().query("select code from opd where id = $1", [id]);
  return (rows[0]?.code as string | undefined) ?? null;
}

/** Bacaan ber-cache (dibagi semua request, dibuang saat CMS menyimpan). */
export const cmsSummary = cached(loadCmsSummary, "probis/repo:cmsSummary", [TAGS.content]);
export const opdCodeOf = cached(loadOpdCodeOf, "probis/repo:opdCodeOf", [TAGS.reference]);
