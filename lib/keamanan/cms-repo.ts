import type { PoolClient } from "pg";
import type { Actor } from "@/lib/access";
import { getDb } from "@/lib/db";
import type { KeamananRecord, ProbisReview, SubmissionStatus } from "@/lib/types";
import { kegiatanConfig, type Kegiatan } from "./jenis";
import type { SecurityRef } from "./link";
import type { KeamananValues } from "./schema";
import { cached, TAGS } from "@/lib/cache";
import { importBatch, type ImportBatch } from "@/lib/cms/batch";

/** Akses data CMS Domain Keamanan (server saja). Pola sama dengan lib/infrastruktur/cms-repo.ts, tanpa referensi berversi. */

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

const SELECT = `
  select s.id, s.code, s.kind, s.name, s.description, to_char(s.activity_date, 'YYYY-MM-DD') as activity_date, s.attributes,
         o.code as opd_code, o.name as opd_name, o.id as opd_id,
         ap.name as period, s.status::text as status, s.updated_at, s.is_sample
  from security_activities s
  join opd o on o.id = s.opd_id
  join architecture_periods ap on ap.id = s.period_id`;

type Row = Record<string, string | null> & { updated_at: Date; is_sample: boolean; attributes: Record<string, string> };

const toRecord = (r: Row): KeamananRecord => ({
  id: r.id!,
  code: r.code!,
  name: r.name!,
  jenis: r.kind as Kegiatan,
  deskripsi: r.description,
  tanggal: r.activity_date,
  atribut: r.attributes ?? {},
  opdId: r.opd_id!,
  opdCode: r.opd_code!,
  opdName: r.opd_name!,
  period: r.period ?? "",
  status: r.status as SubmissionStatus,
  updatedAt: r.updated_at.toISOString(),
  isSample: r.is_sample,
});

/** Daftar kegiatan sesuai cakupan: operator hanya OPD-nya; `statuses` opsional. */
async function loadListKeamanan({ opdId, statuses }: { opdId?: string | null; statuses?: readonly string[] } = {}) {
  const where: string[] = [];
  const params: unknown[] = [];
  if (opdId) where.push(`s.opd_id = $${params.push(opdId)}`);
  if (statuses?.length) where.push(`s.status::text = any($${params.push(statuses)})`);
  const { rows } = await db().query<Row>(`${SELECT} ${where.length ? `where ${where.join(" and ")}` : ""} order by s.updated_at desc`, params);
  return rows.map(toRecord);
}

export async function getKeamanan(id: string) {
  const { rows } = await db().query<Row>(`${SELECT} where s.id = $1`, [id]);
  return rows[0] ? toRecord(rows[0]) : null;
}

export async function getReviews(id: string): Promise<ProbisReview[]> {
  const { rows } = await db().query(
    "select id, coalesce(actor_name, 'Sistem') as actor_name, from_status::text, to_status::text, note, created_at from validation_history where security_activity_id = $1 order by created_at desc",
    [id],
  );
  return rows.map((r) => ({ id: r.id, actorName: r.actor_name, fromStatus: r.from_status, toStatus: r.to_status, note: r.note, createdAt: r.created_at.toISOString() }));
}

/** Ringkasan beranda CMS untuk kegiatan keamanan dalam cakupan pengguna. */
async function loadKeamananSummary(opdId: string | null) {
  const scope = opdId ? "where s.opd_id = $1" : "";
  const params = opdId ? [opdId] : [];
  const [counts, flags, recent] = await Promise.all([
    db().query(`select s.status::text as status, count(*)::int as n from security_activities s ${scope} group by 1`, params),
    db().query(`select count(*) filter (where s.is_sample)::int as samples from security_activities s ${scope}`, params),
    db().query(
      `select vh.id, vh.actor_name, vh.to_status::text, vh.note, vh.created_at, s.name
       from validation_history vh join security_activities s on s.id = vh.security_activity_id ${scope}
       order by vh.created_at desc limit 8`,
      params,
    ),
  ]);
  return {
    samples: flags.rows[0].samples as number,
    review: 0,
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

async function ids(client: PoolClient, v: Pick<KeamananValues, "opd" | "period">, batch?: ImportBatch) {
  const read = batch?.lookup ?? ((sql: string, params: unknown[]) => client.query(sql, params));
  const { rows } = await read("select (select id from opd where code = $1) as opd_id, (select id from architecture_periods where name = $2) as period_id", [v.opd, v.period]);
  if (!rows[0].opd_id) throw new Error("Instansi tidak ditemukan.");
  if (!rows[0].period_id) throw new Error(`Periode “${v.period}” belum terdaftar. Tambahkan di Pengaturan › Periode Arsitektur.`);
  return { opd_id: rows[0].opd_id as string, period_id: rows[0].period_id as string };
}

/** ID kegiatan otomatis: GSK-KAM {singkatan kegiatan}.{urutan 3 digit}. */
async function nextCode(client: PoolClient, jenis: Kegiatan, batch?: ImportBatch) {
  const prefix = `GSK-KAM ${kegiatanConfig[jenis].abbr}.`;
  if (batch) return batch.code(prefix, 3);
  const { rows } = await client.query("select code from security_activities where code like $1", [`${prefix}%`]);
  const max = rows.reduce((m, r) => Math.max(m, Number(String(r.code).slice(prefix.length)) || 0), 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

async function review(client: PoolClient, id: string, actor: Actor, from: SubmissionStatus | null, to: SubmissionStatus, note?: string | null, batch?: ImportBatch) {
  if (batch) return batch.later("validation_history", ["security_activity_id", "actor_id", "actor_name", "from_status", "to_status", "note"], [id, actor.id, actor.name, from, to, note ?? null]);
  await client.query("insert into validation_history (security_activity_id, actor_id, actor_name, from_status, to_status, note) values ($1,$2,$3,$4,$5,$6)", [
    id,
    actor.id,
    actor.name,
    from,
    to,
    note ?? null,
  ]);
}

/** Kolom isian (urutan sama dengan $2…$6 di INSERT/UPDATE). */
const columns = (v: KeamananValues) => [v.jenis, v.name, v.deskripsi, v.tanggal, JSON.stringify(v.atribut)];
const COLS = "kind, name, description, activity_date, attributes";

async function insert(client: PoolClient, v: KeamananValues, actor: Actor, status: SubmissionStatus, code?: string, batch?: ImportBatch) {
  const ref = await ids(client, v, batch);
  const finalCode = code || (await nextCode(client, v.jenis, batch));
  const { rows } = await client.query(
    `insert into security_activities (code, ${COLS}, opd_id, period_id, status, created_by, submitted_by)
     values (${Array.from({ length: 11 }, (_, i) => `$${i + 1}`).join(",")}) returning id`,
    [finalCode, ...columns(v), ref.opd_id, ref.period_id, status, actor.id, status === "submitted" ? actor.id : null],
  );
  const id = rows[0].id as string;
  await review(client, id, actor, null, status, status === "submitted" ? "Diajukan" : "Draf dibuat", batch);
  return id;
}

const UPDATE = `update security_activities set ${COLS.split(", ")
  .map((c, i) => `${c}=$${i + 2}`)
  .join(", ")}, opd_id=$7, period_id=$8, updated_at = now()`;

export function createKeamanan(v: KeamananValues, actor: Actor, submit: boolean) {
  return tx((client) => insert(client, v, actor, submit ? "submitted" : "draft"));
}

export function updateKeamanan(id: string, v: KeamananValues, actor: Actor, submit: boolean) {
  return tx(async (client) => {
    const ref = await ids(client, v);
    const { rows } = await client.query("select status::text from security_activities where id = $1 for update", [id]);
    const from = rows[0]?.status as SubmissionStatus | undefined;
    if (!from) throw new Error("Kegiatan keamanan tidak ditemukan.");
    const to: SubmissionStatus = submit ? "submitted" : from;
    await client.query(
      `${UPDATE}, status = $9::text::submission_status, submitted_by = case when $9::text = 'submitted' then $10::uuid else submitted_by end where id = $1`,
      [id, ...columns(v), ref.opd_id, ref.period_id, to, actor.id],
    );
    if (to !== from) await review(client, id, actor, from, to, "Diajukan");
    return id;
  });
}

export async function deleteKeamanan(id: string) {
  await db().query("delete from security_activities where id = $1", [id]);
}

/** Ubah status alur verifikasi dan catat riwayatnya (kunci optimis pada status asal). */
export function transition(id: string, from: SubmissionStatus, to: SubmissionStatus, actor: Actor, note?: string | null) {
  return tx(async (client) => {
    const who = to === "verified" ? "verified_by = $4" : to === "approved" ? "approved_by = $4, approved_at = now()" : to === "submitted" ? "submitted_by = $4" : null;
    const { rowCount } = await client.query(
      `update security_activities set status = $3, updated_at = now() ${who ? `, ${who}` : ""} where id = $1 and status::text = $2`,
      who ? [id, from, to, actor.id] : [id, from, to],
    );
    if (!rowCount) throw new Error("Status kegiatan sudah berubah. Muat ulang halaman.");
    await review(client, id, actor, from, to, note);
  });
}

/** Simpan hasil impor dalam satu transaksi. Baris ber-ID yang sudah ada diperbarui bila `update` aktif. */
export function importRows(rows: (KeamananValues & { code?: string | null })[], actor: Actor, status: SubmissionStatus, update: boolean) {
  return tx(async (client) => {
    let created = 0,
      updated = 0,
      skipped = 0;
    const codes = rows.map((r) => r.code).filter((c): c is string => !!c);
    const found = codes.length
      ? (await client.query("select s.id, s.status::text, s.code, ap.name as period from security_activities s join architecture_periods ap on ap.id = s.period_id where s.code = any($1)", [codes])).rows
      : [];
    const byKey = new Map(found.map((r) => [`${r.code}|${r.period}`, r as { id: string; status: SubmissionStatus }]));
    const batch = importBatch(client, "security_activities", codes);
    for (const row of rows) {
      const existing = row.code ? byKey.get(`${row.code}|${row.period}`) : undefined;
      if (existing) {
        if (!update) {
          skipped++;
          continue;
        }
        const ref = await ids(client, row, batch);
        await client.query(`${UPDATE} where id = $1`, [existing.id, ...columns(row), ref.opd_id, ref.period_id]);
        await review(client, existing.id, actor, existing.status, existing.status, "Diperbarui lewat impor", batch);
        updated++;
      } else {
        await insert(client, row, actor, status, row.code ?? undefined, batch);
        created++;
      }
    }
    await batch.flush();
    return { created, updated, skipped };
  });
}

/** Pasangan "ID|periode" yang sudah ada (untuk pratinjau impor; ID unik per periode). */
export async function existingCodes(codes: string[]) {
  if (!codes.length) return new Set<string>();
  const { rows } = await db().query("select s.code, ap.name as period from security_activities s join architecture_periods ap on ap.id = s.period_id where s.code = any($1)", [codes]);
  return new Set(rows.map((r) => `${r.code}|${r.period}`));
}

/** Hapus seluruh kegiatan contoh. */
export async function clearSamples() {
  const { rowCount } = await db().query("delete from security_activities where is_sample");
  return rowCount ?? 0;
}

/** Kegiatan tervalidasi sebagai pilihan tautan dependensi keamanan (semua periode). */
async function loadSecurityRefs(): Promise<SecurityRef[]> {
  const { rows } = await db().query(
    "select s.code, s.name, s.kind, ap.name as period from security_activities s join architecture_periods ap on ap.id = s.period_id where s.status = 'approved' order by s.activity_date desc nulls last, s.code",
  );
  return rows.map((r) => ({ code: r.code, name: r.name, jenis: r.kind, period: r.period }));
}

/** Seperti `securityRefs`, tetapi kosong bila database belum siap (dipakai layout CMS). */
export const securityRefsSafe = () => securityRefs().catch(() => []);

/** Bacaan ber-cache (dibagi semua request, dibuang saat CMS menyimpan). */
export const keamananSummary = cached(loadKeamananSummary, "keamanan/cms-repo:keamananSummary", [TAGS.content]);
export const securityRefs = cached(loadSecurityRefs, "keamanan/cms-repo:securityRefs", [TAGS.content]);
export const listKeamanan = cached(loadListKeamanan, "keamanan/cms-repo:listKeamanan", [TAGS.content]);
