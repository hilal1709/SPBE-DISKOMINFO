import type { PoolClient } from "pg";
import { assertImportUpdate, assertStillEditable, importStatus, importUpdateStatus } from "@/lib/cms/guards";
import type { Actor } from "@/lib/access";
import { getDb } from "@/lib/db";
import { pdByCode } from "@/lib/probis/reference";
import type { AplikasiRecord, ProbisReview, SubmissionStatus } from "@/lib/types";
import { kepemilikanOf } from "./reference";
import type { AplikasiValues } from "./schema";
import { cached, TAGS } from "@/lib/cache";
import { importBatch, type ImportBatch } from "@/lib/cms/batch";

/** Akses data CMS Domain Aplikasi (server saja). Pola sama dengan lib/data/cms-repo.ts. */

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

/** Tautan dependensi aplikasi. `approvedOnly` untuk portal publik (lib/aplikasi/repo.ts): entri belum tervalidasi tidak tampil. */
export const linksSql = (approvedOnly = false) => {
  const ok = (t: string) => (approvedOnly ? ` and ${t}.status = 'approved'` : "");
  return `
  coalesce((select json_agg(json_build_object('id', pb.code, 'name', pb.name, 'status', pb.status::text, 'sasaran', pb.strategic_goal, 'iku', pb.iku) order by pb.code)
            from application_process_businesses x join process_businesses pb on pb.id = x.process_business_id
            where x.application_id = a.id${ok("pb")}), '[]') as probis,
  coalesce((select json_agg(json_build_object('id', s.code, 'name', s.name) order by s.code)
            from application_services x join services s on s.id = x.service_id
            where x.application_id = a.id${ok("s")}), '[]') as layanan,
  coalesce((select json_agg(json_build_object('id', d.code, 'name', d.name) order by d.code)
            from application_datasets x join datasets d on d.id = x.dataset_id
            where x.application_id = a.id${ok("d")}), '[]') as data,
  coalesce((select json_object_agg(d.code, d.name) from datasets d
            where d.period_id = a.period_id${ok("d")} and d.code = any(string_to_array(coalesce(a.input_data, '') || E'\\n' || coalesce(a.output_data, ''), E'\\n'))), '{}') as data_names`;
};
const LINKS_SQL = linksSql();

// raa_id menunjuk node terdalam (L3, atau L2 tanpa turunan); L1–L3 diturunkan dari induknya.
export const RAA_SQL = `
  case when n.level = 3 then p2.code else p1.code end as raa1,
  case when n.level = 3 then p1.code else n.code end as raa2,
  case when n.level = 3 then n.code end as raa3`;
export const RAA_JOIN = `
  left join raa_references n on n.id = a.raa_id
  left join raa_references p1 on p1.id = n.parent_id
  left join raa_references p2 on p2.id = p1.parent_id`;

const SELECT = `
  select a.id, a.code, a.name, a.description, a.function_desc, a.output, a.db_engine, a.basis, a.license, a.language, a.framework,
         o.code as opd_code, o.name as opd_name, o.id as opd_id, coalesce(dv.code, a.developer) as developer,
         a.input_data, a.output_data, a.supplier, a.customer, a.cloud, a.server, a.splp, a.jip,
         ap.name as period, a.status::text as status, a.security, a.raa_l4, a.raa_l5, a.updated_at, a.is_sample, a.raa_review,
         ${RAA_SQL},
         ${LINKS_SQL}
  from applications a
  join opd o on o.id = a.opd_id
  left join opd dv on dv.id = a.developer_opd_id
  join architecture_periods ap on ap.id = a.period_id
  ${RAA_JOIN}`;

type Link = { id: string; name: string };
type Row = Record<string, string | null> & {
  updated_at: Date;
  is_sample: boolean;
  raa_review: boolean;
  security: Record<string, string[]>;
  probis: (Link & { status: SubmissionStatus })[];
  layanan: Link[];
  data: Link[];
  data_names: Record<string, string>;
};

const toRecord = (r: Row): AplikasiRecord => ({
  id: r.id!,
  code: r.code!,
  name: r.name!,
  uraian: r.description ?? "",
  fungsi: r.function_desc ?? "",
  luaran: r.output ?? "",
  mesin: r.db_engine,
  basis: r.basis as AplikasiRecord["basis"],
  lisensi: r.license as AplikasiRecord["lisensi"],
  bahasa: r.language ?? "",
  kerangka: r.framework,
  pengembang: r.developer ?? r.opd_code!,
  kepemilikan: kepemilikanOf(r.developer ?? r.opd_code!),
  opdId: r.opd_id!,
  opdCode: r.opd_code!,
  opdName: r.opd_name!,
  period: r.period ?? "",
  status: r.status as SubmissionStatus,
  raa1: r.raa1,
  raa2: r.raa2,
  raa3: r.raa3,
  raaL4: r.raa_l4,
  raaL5: r.raa_l5,
  probis: r.probis.map((p) => ({ id: p.id, name: p.name, status: p.status })),
  layanan: r.layanan,
  data: r.data,
  dataNames: r.data_names ?? {},
  inputData: r.input_data,
  outputData: r.output_data,
  supplier: r.supplier,
  customer: r.customer,
  cloud: r.cloud,
  server: r.server,
  splp: r.splp,
  jip: r.jip,
  security: r.security ?? {},
  updatedAt: r.updated_at.toISOString(),
  isSample: r.is_sample,
  raaReview: r.raa_review,
});

/** Daftar aplikasi sesuai cakupan: operator hanya OPD-nya; `statuses` opsional. */
async function loadListAplikasi({ opdId, statuses }: { opdId?: string | null; statuses?: readonly string[] } = {}) {
  const where: string[] = [];
  const params: unknown[] = [];
  if (opdId) where.push(`a.opd_id = $${params.push(opdId)}`);
  if (statuses?.length) where.push(`a.status::text = any($${params.push(statuses)})`);
  const { rows } = await db().query<Row>(`${SELECT} ${where.length ? `where ${where.join(" and ")}` : ""} order by a.updated_at desc`, params);
  return rows.map(toRecord);
}

export async function getAplikasi(id: string) {
  const { rows } = await db().query<Row>(`${SELECT} where a.id = $1`, [id]);
  return rows[0] ? toRecord(rows[0]) : null;
}

export async function getReviews(id: string): Promise<ProbisReview[]> {
  const { rows } = await db().query(
    "select id, coalesce(actor_name, 'Sistem') as actor_name, from_status::text, to_status::text, note, created_at from validation_history where application_id = $1 order by created_at desc",
    [id],
  );
  return rows.map((r) => ({ id: r.id, actorName: r.actor_name, fromStatus: r.from_status, toStatus: r.to_status, note: r.note, createdAt: r.created_at.toISOString() }));
}

/** Ringkasan beranda CMS untuk aplikasi dalam cakupan pengguna. */
async function loadAplikasiSummary(opdId: string | null) {
  const scope = opdId ? "where a.opd_id = $1" : "";
  const params = opdId ? [opdId] : [];
  const [counts, flags, recent] = await Promise.all([
    db().query(`select a.status::text as status, count(*)::int as n from applications a ${scope} group by 1`, params),
    db().query(`select count(*) filter (where a.is_sample)::int as samples, count(*) filter (where a.raa_review)::int as review from applications a ${scope}`, params),
    db().query(
      `select vh.id, vh.actor_name, vh.to_status::text, vh.note, vh.created_at, a.name
       from validation_history vh join applications a on a.id = vh.application_id ${scope}
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
 * Pilihan dependensi pada satu periode: proses bisnis yang sudah disetujui (aplikasi wajib selaras probis),
 * layanan, dan data. Semuanya lintas OPD; milik unit operasional ditaruh paling atas.
 */
export async function dependencyOptions(opd: string, period: string) {
  const query = (table: string, extra = "") =>
    db().query(
      `select t.code, t.name, o.code as opd from ${table} t join opd o on o.id = t.opd_id join architecture_periods ap on ap.id = t.period_id
       where ap.name = $1 ${extra} order by (o.code = $2) desc, t.code`,
      [period, opd],
    );
  const [probis, layanan, data, infra] = await Promise.all([
    query("process_businesses", "and t.status = 'approved'"),
    query("services"),
    query("datasets"),
    // Komponen infrastruktur untuk kolom komputasi awan, server (atau fasilitas tempatnya), SPLP, dan JIP.
    db().query(
      `select t.code, t.name, t.kind, o.code as opd from infrastructures t join opd o on o.id = t.opd_id join architecture_periods ap on ap.id = t.period_id
       where ap.name = $1 and t.kind in ('cloud', 'server', 'fasilitas', 'splp', 'jip') and t.status <> 'rejected' order by t.kind, t.name`,
      [period],
    ),
  ]);
  const map = (rows: Record<string, string>[]) => rows.map((r) => ({ code: r.code!, name: r.name!, opd: r.opd! }));
  return { probis: map(probis.rows), layanan: map(layanan.rows), data: map(data.rows), infra: infra.rows.map((r) => ({ code: r.code as string, name: r.name as string, opd: r.opd as string, jenis: r.kind as string })) };
}

async function ids(client: PoolClient, v: Pick<AplikasiValues, "opd" | "period" | "raa" | "probis" | "layanan" | "data" | "pengembang">, batch?: ImportBatch) {
  const read = batch?.lookup ?? ((sql: string, params: unknown[]) => client.query(sql, params));
  const { rows } = await read(
    `select (select id from opd where code = $1) as opd_id,
            (select id from architecture_periods where name = $2) as period_id,
            (select r.id from raa_references r join architecture_periods ap on ap.raa_version_id = r.version_id
              where ap.name = $2 and r.code = $3 and r.level in (2, 3)) as raa_id,
            (select id from opd where code = $4) as developer_opd_id`,
    [v.opd, v.period, v.raa, v.pengembang],
  );
  const found = rows[0];
  if (!found.opd_id) throw new Error("Unit operasional teknologi tidak ditemukan.");
  if (!found.period_id) throw new Error(`Periode “${v.period}” belum terdaftar. Tambahkan di Pengaturan › Periode Arsitektur.`);
  if (!found.raa_id) throw new Error(`RAA ${v.raa} tidak ada di versi RAA periode ${v.period}.`);
  // Dependensi harus berada di periode yang sama.
  const pick = (table: string, codes: string[], cols = "id, code") =>
    codes.length ? read(`select ${cols} from ${table} where period_id = $1 and code = any($2)`, [found.period_id, codes]) : Promise.resolve({ rows: [] as Record<string, string>[] });
  // Berurutan: satu klien transaksi tidak boleh menjalankan kueri paralel.
  const probis = await pick("process_businesses", v.probis, "id, code, status::text as status");
  const layanan = await pick("services", v.layanan);
  const data = await pick("datasets", v.data);
  const missing = (codes: string[], rows: { code: string }[]) => codes.filter((code) => !rows.some((r) => r.code === code));
  const noProbis = missing(v.probis, probis.rows as { code: string }[]);
  if (noProbis.length) throw new Error(`Proses bisnis ${noProbis.slice(0, 3).join(", ")} tidak ada di periode ${v.period}.`);
  // Notulen: aplikasi ditolak bila tidak tertaut proses bisnis yang disetujui.
  const unapproved = probis.rows.filter((p) => p.status !== "approved").map((p) => p.code as string);
  if (unapproved.length) throw new Error(`Proses bisnis ${unapproved.slice(0, 3).join(", ")} belum disetujui. Aplikasi hanya boleh tertaut proses bisnis yang sudah tervalidasi.`);
  const noLayanan = missing(v.layanan, layanan.rows as { code: string }[]);
  if (noLayanan.length) throw new Error(`Layanan ${noLayanan.slice(0, 3).join(", ")} tidak ada di periode ${v.period}.`);
  const noData = missing(v.data, data.rows as { code: string }[]);
  if (noData.length) throw new Error(`Data ${noData.slice(0, 3).join(", ")} tidak ada di periode ${v.period}.`);
  return {
    opd_id: found.opd_id as string,
    period_id: found.period_id as string,
    raa_id: found.raa_id as string,
    developer_opd_id: found.developer_opd_id as string | null,
    probis: probis.rows.map((p) => p.id as string),
    layanan: layanan.rows.map((s) => s.id as string),
    data: data.rows.map((d) => d.id as string),
  };
}

/** ID aplikasi otomatis: GSK-APL {kode RAA tanpa "RAA."}.{urutan 3 digit}. */
async function nextCode(client: PoolClient, raa: string, batch?: ImportBatch) {
  const prefix = `GSK-APL ${raa.slice(4)}.`;
  if (batch) return batch.code(prefix, 3);
  const { rows } = await client.query("select code from applications where code like $1", [`${prefix}%`]);
  const max = rows.reduce((m, r) => Math.max(m, Number(String(r.code).slice(prefix.length)) || 0), 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

async function review(client: PoolClient, id: string, actor: Actor, from: SubmissionStatus | null, to: SubmissionStatus, note?: string | null, batch?: ImportBatch) {
  if (batch) return batch.later("validation_history", ["application_id", "actor_id", "actor_name", "from_status", "to_status", "note"], [id, actor.id, actor.name, from, to, note ?? null]);
  await client.query("insert into validation_history (application_id, actor_id, actor_name, from_status, to_status, note) values ($1,$2,$3,$4,$5,$6)", [
    id,
    actor.id,
    actor.name,
    from,
    to,
    note ?? null,
  ]);
}

/** Tautkan isian RAA L4/L5 ke referensi bila kodenya terdaftar di bawah induknya (selain itu tetap teks bebas). */
async function linkDeep(client: PoolClient, id: string | string[], batch?: ImportBatch) {
  if (batch) return void batch.touched.push(...[id].flat());
  await client.query("update applications a set raa4_id = (select r.id from raa_references r where r.code = a.raa_l4 and r.level = 4 and r.parent_id = a.raa_id) where a.id = any($1)", [[id].flat()]);
  await client.query("update applications a set raa5_id = (select r.id from raa_references r where r.code = a.raa_l5 and r.level = 5 and r.parent_id = a.raa4_id) where a.id = any($1)", [[id].flat()]);
}

async function linkDependencies(client: PoolClient, id: string, ref: { probis: string[]; layanan: string[]; data: string[] }) {
  const links = [
    ["application_process_businesses", "process_business_id", ref.probis],
    ["application_services", "service_id", ref.layanan],
    ["application_datasets", "dataset_id", ref.data],
  ] as const;
  for (const [table, col, list] of links) {
    await client.query(`delete from ${table} where application_id = $1`, [id]);
    if (list.length) await client.query(`insert into ${table} (application_id, ${col}) select $1, unnest($2::uuid[])`, [id, list]);
  }
}

/** Kolom isian (urutan sama dengan $2…$22 di INSERT/UPDATE). Pengembang PD disimpan sebagai id, selain itu teks. */
const columns = (v: AplikasiValues, ref: { developer_opd_id: string | null }) => [
  v.name,
  v.uraian,
  v.fungsi,
  v.luaran,
  v.mesin,
  v.basis,
  v.lisensi,
  v.bahasa,
  v.kerangka,
  ref.developer_opd_id ? null : pdByCode.has(v.pengembang) ? null : v.pengembang,
  v.inputData,
  v.outputData,
  v.supplier,
  v.customer,
  v.cloud,
  v.server,
  v.splp,
  v.jip,
  v.raaL4,
  v.raaL5,
  JSON.stringify(v.security),
];
const COLS = "name, description, function_desc, output, db_engine, basis, license, language, framework, developer, input_data, output_data, supplier, customer, cloud, server, splp, jip, raa_l4, raa_l5, security";

async function insert(client: PoolClient, v: AplikasiValues, actor: Actor, status: SubmissionStatus, code?: string, batch?: ImportBatch) {
  const ref = await ids(client, v, batch);
  const finalCode = code || (await nextCode(client, v.raa, batch));
  const { rows } = await client.query(
    `insert into applications (code, ${COLS}, opd_id, developer_opd_id, period_id, raa_id, status, created_by, submitted_by)
     values (${Array.from({ length: 29 }, (_, i) => `$${i + 1}`).join(",")}) returning id`,
    [finalCode, ...columns(v, ref), ref.opd_id, ref.developer_opd_id, ref.period_id, ref.raa_id, status, actor.id, status === "submitted" ? actor.id : null],
  );
  const id = rows[0].id as string;
  await linkDeep(client, id, batch);
  await linkDependencies(client, id, ref);
  await review(client, id, actor, null, status, status === "submitted" ? "Diajukan" : "Draf dibuat", batch);
  return id;
}

const UPDATE = `update applications set ${COLS.split(", ")
  .map((c, i) => `${c}=$${i + 2}`)
  .join(", ")}, opd_id=$23, developer_opd_id=$24, period_id=$25, raa_id=$26, raa_review = false, updated_at = now()`;

export function createAplikasi(v: AplikasiValues, actor: Actor, submit: boolean) {
  return tx((client) => insert(client, v, actor, submit ? "submitted" : "draft"));
}

export function updateAplikasi(id: string, v: AplikasiValues, actor: Actor, submit: boolean) {
  return tx(async (client) => {
    const ref = await ids(client, v);
    const { rows } = await client.query("select status::text from applications where id = $1 for update", [id]);
    const from = rows[0]?.status as SubmissionStatus | undefined;
    if (!from) throw new Error("Aplikasi tidak ditemukan.");
    assertStillEditable(actor, from);
    const to: SubmissionStatus = submit ? "submitted" : from;
    await client.query(
      `${UPDATE}, status = $27::text::submission_status, submitted_by = case when $27::text = 'submitted' then $28::uuid else submitted_by end where id = $1`,
      [id, ...columns(v, ref), ref.opd_id, ref.developer_opd_id, ref.period_id, ref.raa_id, to, actor.id],
    );
    await linkDeep(client, id);
    await linkDependencies(client, id, ref);
    if (to !== from) await review(client, id, actor, from, to, "Diajukan");
    return id;
  });
}

export async function deleteAplikasi(id: string) {
  await db().query("delete from applications where id = $1", [id]);
}

/**
 * Ubah status alur verifikasi dan catat riwayatnya (kunci optimis pada status asal).
 * Ajuan, verifikasi, dan validasi ditolak bila aplikasi tidak lagi tertaut proses bisnis yang disetujui (notulen).
 */
export function transition(id: string, from: SubmissionStatus, to: SubmissionStatus, actor: Actor, note?: string | null) {
  return tx(async (client) => {
    if (to === "submitted" || to === "verified" || to === "approved") {
      const { rows } = await client.query(
        `select exists (select 1 from application_process_businesses x join process_businesses pb on pb.id = x.process_business_id
                        where x.application_id = $1 and pb.status = 'approved') as ok`,
        [id],
      );
      if (!rows[0].ok) throw new Error("Aplikasi tidak tertaut proses bisnis yang disetujui. Tautkan proses bisnis tervalidasi atau kembalikan ke OPD.");
    }
    const who = to === "verified" ? "verified_by = $4" : to === "approved" ? "approved_by = $4, approved_at = now()" : to === "submitted" ? "submitted_by = $4" : null;
    const { rowCount } = await client.query(
      `update applications set status = $3, updated_at = now() ${who ? `, ${who}` : ""} where id = $1 and status::text = $2`,
      who ? [id, from, to, actor.id] : [id, from, to],
    );
    if (!rowCount) throw new Error("Status aplikasi sudah berubah. Muat ulang halaman.");
    await review(client, id, actor, from, to, note);
  });
}

/** Simpan hasil impor dalam satu transaksi. Baris ber-ID yang sudah ada diperbarui bila `update` aktif. */
export function importRows(rows: (AplikasiValues & { code?: string | null })[], actor: Actor, status: SubmissionStatus, update: boolean) {
  importStatus(status);
  return tx(async (client) => {
    let created = 0,
      updated = 0,
      skipped = 0;
    const codes = rows.map((r) => r.code).filter((c): c is string => !!c);
    const found = codes.length
      ? (await client.query("select a.id, a.status::text, a.opd_id, a.code, ap.name as period from applications a join architecture_periods ap on ap.id = a.period_id where a.code = any($1)", [codes])).rows
      : [];
    const byKey = new Map(found.map((r) => [`${r.code}|${r.period}`, r as { id: string; code: string; status: SubmissionStatus; opd_id: string | null }]));
    const batch = importBatch(client, "applications", codes);
    for (const row of rows) {
      const existing = row.code ? byKey.get(`${row.code}|${row.period}`) : undefined;
      if (existing) {
        if (!update) {
          skipped++;
          continue;
        }
        assertImportUpdate(actor, existing);
        const to = importUpdateStatus(existing.status, status);
        const ref = await ids(client, row, batch);
        await client.query(`${UPDATE}, status = $27::text::submission_status, submitted_by = case when $27::text = 'submitted' then $28::uuid else submitted_by end where id = $1`, [existing.id, ...columns(row, ref), ref.opd_id, ref.developer_opd_id, ref.period_id, ref.raa_id, to, actor.id]);
        await linkDeep(client, existing.id, batch);
        await linkDependencies(client, existing.id, ref);
        await review(client, existing.id, actor, existing.status, to, to !== existing.status ? "Diajukan lewat impor" : "Diperbarui lewat impor", batch);
        updated++;
      } else {
        await insert(client, row, actor, status, row.code ?? undefined, batch);
        created++;
      }
    }
    await batch.flush((touched) => linkDeep(client, touched));
    return { created, updated, skipped };
  });
}

/** Pasangan "ID|periode" yang sudah ada (untuk pratinjau impor; ID unik per periode). */
export async function existingCodes(codes: string[]) {
  if (!codes.length) return new Set<string>();
  const { rows } = await db().query("select a.code, ap.name as period from applications a join architecture_periods ap on ap.id = a.period_id where a.code = any($1)", [codes]);
  return new Set(rows.map((r) => `${r.code}|${r.period}`));
}

/** Hapus seluruh aplikasi contoh. */
export async function clearSamples() {
  const { rowCount } = await db().query("delete from applications where is_sample");
  return rowCount ?? 0;
}

/** Bacaan ber-cache (dibagi semua request, dibuang saat CMS menyimpan). */
export const aplikasiSummary = cached(loadAplikasiSummary, "aplikasi/cms-repo:aplikasiSummary", [TAGS.content]);
export const listAplikasi = cached(loadListAplikasi, "aplikasi/cms-repo:listAplikasi", [TAGS.content]);
