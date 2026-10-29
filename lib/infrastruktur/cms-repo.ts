import type { PoolClient } from "pg";
import { assertImportUpdate, assertStillEditable, importStatus, importUpdateStatus } from "@/lib/cms/guards";
import type { Actor } from "@/lib/access";
import { getDb } from "@/lib/db";
import type { InfrastrukturRecord, ProbisReview, SubmissionStatus } from "@/lib/types";
import { infraTargets, jenisConfig, jenisLabel, type InfraJenis } from "./jenis";
import type { InfrastrukturValues } from "./schema";
import { cached, TAGS } from "@/lib/cache";
import { importBatch, type ImportBatch } from "@/lib/cms/batch";

/** Akses data CMS Domain Infrastruktur (server saja). Pola sama dengan lib/aplikasi/cms-repo.ts. */

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

/** Relasi komponen: keluar (relasi), masuk (terhubung), dan ke domain lain (dipakai juga oleh lib/infrastruktur/repo.ts). */
export const LINKS_SQL = `
  coalesce((select json_agg(json_build_object('id', t.code, 'name', t.name, 'jenis', t.kind) order by t.kind, t.code)
            from infrastructure_links x join infrastructures t on t.id = x.target_id
            where x.infrastructure_id = i.id), '[]') as relasi,
  coalesce((select json_agg(json_build_object('id', t.code, 'name', t.name, 'jenis', t.kind) order by t.kind, t.code)
            from infrastructure_links x join infrastructures t on t.id = x.infrastructure_id
            where x.target_id = i.id), '[]') as terhubung,
  coalesce((select json_agg(json_build_object('id', a.code, 'name', a.name) order by a.code)
            from infrastructure_applications x join applications a on a.id = x.application_id
            where x.infrastructure_id = i.id), '[]') as aplikasi,
  coalesce((select json_agg(json_build_object('id', d.code, 'name', d.name) order by d.code)
            from infrastructure_datasets x join datasets d on d.id = x.dataset_id
            where x.infrastructure_id = i.id), '[]') as data,
  coalesce((select json_agg(json_build_object('id', pb.code, 'name', pb.name) order by pb.code)
            from infrastructure_process_businesses x join process_businesses pb on pb.id = x.process_business_id
            where x.infrastructure_id = i.id), '[]') as probis`;

// rai_id menunjuk node terdalam (L3, atau L2 tanpa turunan); L1–L3 diturunkan dari induknya.
export const RAI_SQL = `
  case when n.level = 3 then p2.code else p1.code end as rai1,
  case when n.level = 3 then p1.code else n.code end as rai2,
  case when n.level = 3 then n.code end as rai3`;
export const RAI_JOIN = `
  left join rai_references n on n.id = i.rai_id
  left join rai_references p1 on p1.id = n.parent_id
  left join rai_references p2 on p2.id = p1.parent_id`;

const SELECT = `
  select i.id, i.code, i.kind, i.name, i.description, i.owner_name, i.ownership, i.manager, i.attributes,
         o.code as opd_code, o.name as opd_name, o.id as opd_id,
         ap.name as period, i.status::text as status, i.security, i.updated_at, i.is_sample, i.rai_review,
         ${RAI_SQL},
         ${LINKS_SQL}
  from infrastructures i
  join opd o on o.id = i.opd_id
  join architecture_periods ap on ap.id = i.period_id
  ${RAI_JOIN}`;

type Link = { id: string; name: string };
type InfraLink = Link & { jenis: InfraJenis };
type Row = Record<string, string | null> & {
  updated_at: Date;
  is_sample: boolean;
  rai_review: boolean;
  attributes: Record<string, string>;
  security: Record<string, string[]>;
  relasi: InfraLink[];
  terhubung: InfraLink[];
  aplikasi: Link[];
  data: Link[];
  probis: Link[];
};

const toRecord = (r: Row): InfrastrukturRecord => ({
  id: r.id!,
  code: r.code!,
  name: r.name!,
  jenis: r.kind as InfraJenis,
  deskripsi: r.description,
  pemilik: r.owner_name,
  kepemilikan: r.ownership as InfrastrukturRecord["kepemilikan"],
  pengelola: r.manager,
  atribut: r.attributes ?? {},
  opdId: r.opd_id!,
  opdCode: r.opd_code!,
  opdName: r.opd_name!,
  period: r.period ?? "",
  status: r.status as SubmissionStatus,
  rai1: r.rai1,
  rai2: r.rai2,
  rai3: r.rai3,
  relasi: r.relasi,
  terhubung: r.terhubung,
  aplikasi: r.aplikasi,
  data: r.data,
  probis: r.probis,
  security: r.security ?? {},
  updatedAt: r.updated_at.toISOString(),
  isSample: r.is_sample,
  raiReview: r.rai_review,
});

/** Daftar komponen sesuai cakupan: operator hanya OPD-nya; `statuses` opsional. */
async function loadListInfrastruktur({ opdId, statuses }: { opdId?: string | null; statuses?: readonly string[] } = {}) {
  const where: string[] = [];
  const params: unknown[] = [];
  if (opdId) where.push(`i.opd_id = $${params.push(opdId)}`);
  if (statuses?.length) where.push(`i.status::text = any($${params.push(statuses)})`);
  const { rows } = await db().query<Row>(`${SELECT} ${where.length ? `where ${where.join(" and ")}` : ""} order by i.updated_at desc`, params);
  return rows.map(toRecord);
}

export async function getInfrastruktur(id: string) {
  const { rows } = await db().query<Row>(`${SELECT} where i.id = $1`, [id]);
  return rows[0] ? toRecord(rows[0]) : null;
}

export async function getReviews(id: string): Promise<ProbisReview[]> {
  const { rows } = await db().query(
    "select id, coalesce(actor_name, 'Sistem') as actor_name, from_status::text, to_status::text, note, created_at from validation_history where infrastructure_id = $1 order by created_at desc",
    [id],
  );
  return rows.map((r) => ({ id: r.id, actorName: r.actor_name, fromStatus: r.from_status, toStatus: r.to_status, note: r.note, createdAt: r.created_at.toISOString() }));
}

/** Ringkasan beranda CMS untuk infrastruktur dalam cakupan pengguna. */
async function loadInfrastrukturSummary(opdId: string | null) {
  const scope = opdId ? "where i.opd_id = $1" : "";
  const params = opdId ? [opdId] : [];
  const [counts, flags, recent] = await Promise.all([
    db().query(`select i.status::text as status, count(*)::int as n from infrastructures i ${scope} group by 1`, params),
    db().query(`select count(*) filter (where i.is_sample)::int as samples, count(*) filter (where i.rai_review)::int as review from infrastructures i ${scope}`, params),
    db().query(
      `select vh.id, vh.actor_name, vh.to_status::text, vh.note, vh.created_at, i.name
       from validation_history vh join infrastructures i on i.id = vh.infrastructure_id ${scope}
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

/**
 * Pilihan relasi pada satu periode: komponen infrastruktur lain (beserta jenisnya), aplikasi, data, dan
 * proses bisnis tervalidasi. Semuanya lintas OPD; milik instansi pengisi ditaruh paling atas.
 */
export async function dependencyOptions(opd: string, period: string) {
  const query = (table: string, extra = "", cols = "t.code, t.name") =>
    db().query(
      `select ${cols}, o.code as opd from ${table} t join opd o on o.id = t.opd_id join architecture_periods ap on ap.id = t.period_id
       where ap.name = $1 ${extra} order by (o.code = $2) desc, t.code`,
      [period, opd],
    );
  const [infra, aplikasi, data, probis] = await Promise.all([
    query("infrastructures", "", "t.code, t.name, t.kind"),
    query("applications"),
    query("datasets"),
    query("process_businesses", "and t.status = 'approved'"),
  ]);
  const map = (rows: Record<string, string>[]) => rows.map((r) => ({ code: r.code!, name: r.name!, opd: r.opd! }));
  return { infra: infra.rows.map((r) => ({ code: r.code as string, name: r.name as string, opd: r.opd as string, jenis: r.kind as InfraJenis })), aplikasi: map(aplikasi.rows), data: map(data.rows), probis: map(probis.rows) };
}

async function ids(client: PoolClient, v: Pick<InfrastrukturValues, "opd" | "period" | "rai" | "jenis" | "relasi" | "aplikasi" | "data" | "probis">, self?: string, batch?: ImportBatch) {
  const read = batch?.lookup ?? ((sql: string, params: unknown[]) => client.query(sql, params));
  const { rows } = await read(
    `select (select id from opd where code = $1) as opd_id,
            (select id from architecture_periods where name = $2) as period_id,
            (select r.id from rai_references r join architecture_periods ap on ap.rai_version_id = r.version_id
              where ap.name = $2 and r.code = $3 and r.level in (2, 3)) as rai_id`,
    [v.opd, v.period, v.rai],
  );
  const found = rows[0];
  if (!found.opd_id) throw new Error("Instansi tidak ditemukan.");
  if (!found.period_id) throw new Error(`Periode “${v.period}” belum terdaftar. Tambahkan di Pengaturan › Periode Arsitektur.`);
  if (!found.rai_id) throw new Error(`RAI ${v.rai} tidak ada di versi RAI periode ${v.period}.`);
  const pick = (table: string, codes: string[], cols = "id, code") =>
    codes.length ? read(`select ${cols} from ${table} where period_id = $1 and code = any($2)`, [found.period_id, codes]) : Promise.resolve({ rows: [] as Record<string, string>[] });
  // Berurutan: satu klien transaksi tidak boleh menjalankan kueri paralel.
  const infra = await pick("infrastructures", v.relasi, "id, code, kind");
  const aplikasi = await pick("applications", v.aplikasi);
  const data = await pick("datasets", v.data);
  const probis = await pick("process_businesses", v.probis);
  const missing = (codes: string[], rows: { code: string }[]) => codes.filter((code) => !rows.some((r) => r.code === code));
  const check = (noun: string, codes: string[], found: { rows: Record<string, string>[] }) => {
    const lost = missing(codes, found.rows as { code: string }[]);
    if (lost.length) throw new Error(`${noun} ${lost.slice(0, 3).join(", ")} tidak ada di periode ${v.period}.`);
  };
  check("Komponen", v.relasi, infra);
  check("Aplikasi", v.aplikasi, aplikasi);
  check("Data", v.data, data);
  check("Proses bisnis", v.probis, probis);
  // Relasi antarkomponen mengikuti kolom template komponen ini.
  const allowed = new Set<string>(infraTargets(v.jenis));
  const wrong = infra.rows.filter((r) => !allowed.has(r.kind!));
  if (wrong.length) throw new Error(`${jenisConfig[v.jenis].label} tidak dapat ditautkan ke ${[...new Set(wrong.map((r) => jenisLabel[r.kind as InfraJenis]))].join(", ")}.`);
  return {
    opd_id: found.opd_id as string,
    period_id: found.period_id as string,
    rai_id: found.rai_id as string,
    relasi: infra.rows.map((r) => r.id as string).filter((id) => id !== self),
    aplikasi: aplikasi.rows.map((r) => r.id as string),
    data: data.rows.map((r) => r.id as string),
    probis: probis.rows.map((r) => r.id as string),
  };
}

/** ID komponen otomatis: GSK-INF {kode RAI tanpa "RAI."}.{urutan 3 digit}. */
async function nextCode(client: PoolClient, rai: string, batch?: ImportBatch) {
  const prefix = `GSK-INF ${rai.slice(4)}.`;
  if (batch) return batch.code(prefix, 3);
  const { rows } = await client.query("select code from infrastructures where code like $1", [`${prefix}%`]);
  const max = rows.reduce((m, r) => Math.max(m, Number(String(r.code).slice(prefix.length)) || 0), 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

async function review(client: PoolClient, id: string, actor: Actor, from: SubmissionStatus | null, to: SubmissionStatus, note?: string | null, batch?: ImportBatch) {
  if (batch) return batch.later("validation_history", ["infrastructure_id", "actor_id", "actor_name", "from_status", "to_status", "note"], [id, actor.id, actor.name, from, to, note ?? null]);
  await client.query("insert into validation_history (infrastructure_id, actor_id, actor_name, from_status, to_status, note) values ($1,$2,$3,$4,$5,$6)", [
    id,
    actor.id,
    actor.name,
    from,
    to,
    note ?? null,
  ]);
}

async function linkDependencies(client: PoolClient, id: string, ref: { relasi: string[]; aplikasi: string[]; data: string[]; probis: string[] }) {
  const links = [
    ["infrastructure_links", "target_id", ref.relasi],
    ["infrastructure_applications", "application_id", ref.aplikasi],
    ["infrastructure_datasets", "dataset_id", ref.data],
    ["infrastructure_process_businesses", "process_business_id", ref.probis],
  ] as const;
  for (const [table, col, list] of links) {
    await client.query(`delete from ${table} where infrastructure_id = $1`, [id]);
    if (list.length) await client.query(`insert into ${table} (infrastructure_id, ${col}) select $1, unnest($2::uuid[])`, [id, list]);
  }
}

/** Kolom isian (urutan sama dengan $2…$9 di INSERT/UPDATE). */
const columns = (v: InfrastrukturValues) => [v.jenis, v.name, v.deskripsi, v.pemilik, v.kepemilikan, v.pengelola, JSON.stringify(v.atribut), JSON.stringify(v.security)];
const COLS = "kind, name, description, owner_name, ownership, manager, attributes, security";

async function insert(client: PoolClient, v: InfrastrukturValues, actor: Actor, status: SubmissionStatus, code?: string, batch?: ImportBatch) {
  const ref = await ids(client, v, undefined, batch);
  const finalCode = code || (await nextCode(client, v.rai, batch));
  const { rows } = await client.query(
    `insert into infrastructures (code, ${COLS}, opd_id, period_id, rai_id, status, created_by, submitted_by)
     values (${Array.from({ length: 15 }, (_, i) => `$${i + 1}`).join(",")}) returning id`,
    [finalCode, ...columns(v), ref.opd_id, ref.period_id, ref.rai_id, status, actor.id, status === "submitted" ? actor.id : null],
  );
  const id = rows[0].id as string;
  await linkDependencies(client, id, ref);
  await review(client, id, actor, null, status, status === "submitted" ? "Diajukan" : "Draf dibuat", batch);
  return id;
}

const UPDATE = `update infrastructures set ${COLS.split(", ")
  .map((c, i) => `${c}=$${i + 2}`)
  .join(", ")}, opd_id=$10, period_id=$11, rai_id=$12, rai_review = false, updated_at = now()`;

export function createInfrastruktur(v: InfrastrukturValues, actor: Actor, submit: boolean) {
  return tx((client) => insert(client, v, actor, submit ? "submitted" : "draft"));
}

export function updateInfrastruktur(id: string, v: InfrastrukturValues, actor: Actor, submit: boolean) {
  return tx(async (client) => {
    const ref = await ids(client, v, id);
    const { rows } = await client.query("select status::text from infrastructures where id = $1 for update", [id]);
    const from = rows[0]?.status as SubmissionStatus | undefined;
    if (!from) throw new Error("Komponen infrastruktur tidak ditemukan.");
    assertStillEditable(actor, from);
    const to: SubmissionStatus = submit ? "submitted" : from;
    await client.query(
      `${UPDATE}, status = $13::text::submission_status, submitted_by = case when $13::text = 'submitted' then $14::uuid else submitted_by end where id = $1`,
      [id, ...columns(v), ref.opd_id, ref.period_id, ref.rai_id, to, actor.id],
    );
    await linkDependencies(client, id, ref);
    if (to !== from) await review(client, id, actor, from, to, "Diajukan");
    return id;
  });
}

export async function deleteInfrastruktur(id: string) {
  await db().query("delete from infrastructures where id = $1", [id]);
}

/** Ubah status alur verifikasi dan catat riwayatnya (kunci optimis pada status asal). */
export function transition(id: string, from: SubmissionStatus, to: SubmissionStatus, actor: Actor, note?: string | null) {
  return tx(async (client) => {
    const who = to === "verified" ? "verified_by = $4" : to === "approved" ? "approved_by = $4, approved_at = now()" : to === "submitted" ? "submitted_by = $4" : null;
    const { rowCount } = await client.query(
      `update infrastructures set status = $3, updated_at = now() ${who ? `, ${who}` : ""} where id = $1 and status::text = $2`,
      who ? [id, from, to, actor.id] : [id, from, to],
    );
    if (!rowCount) throw new Error("Status komponen sudah berubah. Muat ulang halaman.");
    await review(client, id, actor, from, to, note);
  });
}

/**
 * Simpan hasil impor dalam satu transaksi. Baris ber-ID yang sudah ada diperbarui bila `update` aktif.
 * Relasi antarkomponen ditautkan setelah semua baris tersimpan, sehingga komponen dalam satu unggahan bisa saling merujuk.
 */
export function importRows(rows: (InfrastrukturValues & { code?: string | null })[], actor: Actor, status: SubmissionStatus, update: boolean) {
  importStatus(status);
  return tx(async (client) => {
    let created = 0,
      updated = 0,
      skipped = 0;
    const codes = rows.map((r) => r.code).filter((c): c is string => !!c);
    const found = codes.length
      ? (await client.query("select i.id, i.status::text, i.opd_id, i.code, ap.name as period from infrastructures i join architecture_periods ap on ap.id = i.period_id where i.code = any($1)", [codes])).rows
      : [];
    const byKey = new Map(found.map((r) => [`${r.code}|${r.period}`, r as { id: string; code: string; status: SubmissionStatus; opd_id: string | null }]));
    const batch = importBatch(client, "infrastructures", codes);
    const saved: [string, InfrastrukturValues][] = [];
    for (const row of rows) {
      const existing = row.code ? byKey.get(`${row.code}|${row.period}`) : undefined;
      const base = { ...row, relasi: [] };
      if (existing) {
        if (!update) {
          skipped++;
          continue;
        }
        assertImportUpdate(actor, existing);
        const to = importUpdateStatus(existing.status, status);
        const ref = await ids(client, base, undefined, batch);
        await client.query(`${UPDATE}, status = $13::text::submission_status, submitted_by = case when $13::text = 'submitted' then $14::uuid else submitted_by end where id = $1`, [existing.id, ...columns(row), ref.opd_id, ref.period_id, ref.rai_id, to, actor.id]);
        await linkDependencies(client, existing.id, ref);
        await review(client, existing.id, actor, existing.status, to, to !== existing.status ? "Diajukan lewat impor" : "Diperbarui lewat impor", batch);
        saved.push([existing.id, row]);
        updated++;
      } else {
        saved.push([await insert(client, base, actor, status, row.code ?? undefined, batch), row]);
        created++;
      }
    }
    // Relasi impor berisi kode atau nama komponen (bisa komponen baru di unggahan yang sama); jenis yang tidak sesuai template dilewati.
    for (const [id, row] of saved) {
      if (!row.relasi.length) continue;
      const { rows: targets } = await client.query(
        `select t.id from infrastructures t join architecture_periods ap on ap.id = t.period_id
         where ap.name = $1 and t.id <> $2 and t.kind = any($3) and (t.code = any($4) or lower(t.name) = any($5))`,
        [row.period, id, infraTargets(row.jenis), row.relasi, row.relasi.map((r) => r.toLowerCase())],
      );
      await client.query("delete from infrastructure_links where infrastructure_id = $1", [id]);
      if (targets.length) await client.query("insert into infrastructure_links (infrastructure_id, target_id) select $1, unnest($2::uuid[])", [id, targets.map((t) => t.id)]);
    }
    await batch.flush();
    return { created, updated, skipped };
  });
}

/** Pasangan "ID|periode" yang sudah ada (untuk pratinjau impor; ID unik per periode). */
export async function existingCodes(codes: string[]) {
  if (!codes.length) return new Set<string>();
  const { rows } = await db().query("select i.code, ap.name as period from infrastructures i join architecture_periods ap on ap.id = i.period_id where i.code = any($1)", [codes]);
  return new Set(rows.map((r) => `${r.code}|${r.period}`));
}

/** Hapus seluruh komponen contoh. */
export async function clearSamples() {
  const { rowCount } = await db().query("delete from infrastructures where is_sample");
  return rowCount ?? 0;
}

/** Bacaan ber-cache (dibagi semua request, dibuang saat CMS menyimpan). */
export const infrastrukturSummary = cached(loadInfrastrukturSummary, "infrastruktur/cms-repo:infrastrukturSummary", [TAGS.content]);
export const listInfrastruktur = cached(loadListInfrastruktur, "infrastruktur/cms-repo:listInfrastruktur", [TAGS.content]);
