import type { PoolClient } from "pg";
import type { Actor } from "@/lib/access";
import { getDb } from "@/lib/db";
import type { LayananRecord, ProbisReview, SubmissionStatus } from "@/lib/types";
import type { LayananValues } from "./schema";

/** Akses data CMS Domain Layanan (server saja). Pola sama dengan lib/probis/repo.ts. */

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
  select s.id, s.code, s.name, s.purpose, s.function_name, s.unit, o.code as opd_code, o.name as opd_name, o.id as opd_id,
         ap.name as period, s.target, s.method, s.status::text as status,
         r1.code as ral1, r2.code as ral2, r3.code as ral3, s.ral_l4, s.ral_l5, rb.code as rab2,
         s.benefit, s.economic_potential, s.risk, s.mitigation, s.kl, s.updated_at, s.is_sample, s.ral_review,
         coalesce((select json_agg(json_build_object('id', pb.code, 'name', pb.name) order by pb.code)
                   from service_process_businesses sp join process_businesses pb on pb.id = sp.process_business_id
                   where sp.service_id = s.id), '[]') as probis
  from services s
  join opd o on o.id = s.opd_id
  join architecture_periods ap on ap.id = s.period_id
  left join ral_references r3 on r3.id = s.ral_id
  left join ral_references r2 on r2.id = r3.parent_id
  left join ral_references r1 on r1.id = r2.parent_id
  left join rab_references rb on rb.id = s.rab_id`;

type Row = Record<string, string | null> & { updated_at: Date; is_sample: boolean; ral_review: boolean; probis: { id: string; name: string }[] };

const toRecord = (r: Row): LayananRecord => ({
  id: r.id!,
  code: r.code!,
  name: r.name!,
  tujuan: r.purpose ?? "",
  fungsi: r.function_name,
  unit: r.unit,
  opdId: r.opd_id!,
  opdCode: r.opd_code!,
  opdName: r.opd_name!,
  period: r.period ?? "",
  target: (r.target ?? "masyarakat") as LayananRecord["target"],
  metode: (r.method ?? "tatap_muka") as LayananRecord["metode"],
  status: r.status as SubmissionStatus,
  ral1: r.ral1,
  ral2: r.ral2,
  ral3: r.ral3,
  ralL4: r.ral_l4,
  ralL5: r.ral_l5,
  rab2: r.rab2,
  manfaat: r.benefit,
  ekonomi: r.economic_potential,
  risiko: r.risk,
  mitigasi: r.mitigation,
  kl: r.kl,
  probis: r.probis,
  updatedAt: r.updated_at.toISOString(),
  isSample: r.is_sample,
  ralReview: r.ral_review,
});

/** Daftar layanan sesuai cakupan: operator hanya OPD-nya; `statuses` opsional. */
export async function listLayanan({ opdId, statuses }: { opdId?: string | null; statuses?: readonly string[] } = {}) {
  const where: string[] = [];
  const params: unknown[] = [];
  if (opdId) where.push(`s.opd_id = $${params.push(opdId)}`);
  if (statuses?.length) where.push(`s.status::text = any($${params.push(statuses)})`);
  const { rows } = await db().query<Row>(`${SELECT} ${where.length ? `where ${where.join(" and ")}` : ""} order by s.updated_at desc`, params);
  return rows.map(toRecord);
}

export async function getLayanan(id: string) {
  const { rows } = await db().query<Row>(`${SELECT} where s.id = $1`, [id]);
  return rows[0] ? toRecord(rows[0]) : null;
}

export async function getReviews(id: string): Promise<ProbisReview[]> {
  const { rows } = await db().query(
    "select id, coalesce(actor_name, 'Sistem') as actor_name, from_status::text, to_status::text, note, created_at from validation_history where service_id = $1 order by created_at desc",
    [id],
  );
  return rows.map((r) => ({ id: r.id, actorName: r.actor_name, fromStatus: r.from_status, toStatus: r.to_status, note: r.note, createdAt: r.created_at.toISOString() }));
}

/** Ringkasan beranda CMS untuk layanan dalam cakupan pengguna. */
export async function layananSummary(opdId: string | null) {
  const scope = opdId ? "where s.opd_id = $1" : "";
  const params = opdId ? [opdId] : [];
  const [counts, flags, recent] = await Promise.all([
    db().query(`select s.status::text as status, count(*)::int as n from services s ${scope} group by 1`, params),
    db().query(`select count(*) filter (where s.is_sample)::int as samples, count(*) filter (where s.ral_review)::int as review from services s ${scope}`, params),
    db().query(
      `select vh.id, vh.actor_name, vh.to_status::text, vh.note, vh.created_at, s.name
       from validation_history vh join services s on s.id = vh.service_id ${scope}
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

/** Kode probis milik OPD pada periode tertentu (pilihan "Proses bisnis yang dilayani"). */
export async function probisOptions(opd: string, period: string) {
  const { rows } = await db().query(
    `select pb.code, pb.name from process_businesses pb join opd o on o.id = pb.opd_id join architecture_periods ap on ap.id = pb.period_id
     where o.code = $1 and ap.name = $2 order by pb.code`,
    [opd, period],
  );
  return rows.map((r) => ({ code: r.code as string, name: r.name as string }));
}

async function ids(client: PoolClient, v: Pick<LayananValues, "opd" | "period" | "ral3" | "rab2" | "probis">) {
  const { rows } = await client.query(
    `select (select id from opd where code = $1) as opd_id,
            (select id from architecture_periods where name = $2) as period_id,
            (select r.id from ral_references r join architecture_periods ap on ap.ral_version_id = r.version_id
              where ap.name = $2 and r.code = $3 and r.level = 3) as ral_id,
            (select r.id from rab_references r join architecture_periods ap on ap.rab_version_id = r.version_id
              where ap.name = $2 and r.code = $4 and r.level = 2) as rab_id`,
    [v.opd, v.period, v.ral3, v.rab2],
  );
  const found = rows[0];
  if (!found.opd_id) throw new Error("Perangkat Daerah tidak ditemukan.");
  if (!found.period_id) throw new Error(`Periode “${v.period}” belum terdaftar. Tambahkan di Pengaturan › Periode Arsitektur.`);
  if (!found.ral_id) throw new Error(`RAL Level 3 ${v.ral3} tidak ada di versi RAL periode ${v.period}.`);
  if (v.rab2 && !found.rab_id) throw new Error(`Urusan ${v.rab2} tidak ada di versi RAB periode ${v.period}.`);
  // Proses bisnis yang dilayani harus berada di periode yang sama.
  const probis = v.probis.length
    ? (await client.query("select id, code from process_businesses where period_id = $1 and code = any($2)", [found.period_id, v.probis])).rows
    : [];
  const missing = v.probis.filter((code) => !probis.some((p) => p.code === code));
  if (missing.length) throw new Error(`Proses bisnis ${missing.slice(0, 3).join(", ")} tidak ada di periode ${v.period}.`);
  return { opd_id: found.opd_id as string, period_id: found.period_id as string, ral_id: found.ral_id as string, rab_id: found.rab_id as string | null, probis: probis.map((p) => p.id as string) };
}

/** ID layanan otomatis: GSK-LYN {kode RAL L3 tanpa "RAL."}.{urutan}. */
async function nextCode(client: PoolClient, ral3: string) {
  const prefix = `GSK-LYN ${ral3.slice(4)}.`;
  const { rows } = await client.query("select code from services where code like $1", [`${prefix}%`]);
  const max = rows.reduce((m, r) => Math.max(m, Number(String(r.code).slice(prefix.length)) || 0), 0);
  return `${prefix}${String(max + 1).padStart(2, "0")}`;
}

async function review(client: PoolClient, id: string, actor: Actor, from: SubmissionStatus | null, to: SubmissionStatus, note?: string | null) {
  await client.query("insert into validation_history (service_id, actor_id, actor_name, from_status, to_status, note) values ($1,$2,$3,$4,$5,$6)", [
    id,
    actor.id,
    actor.name,
    from,
    to,
    note ?? null,
  ]);
}

/** Tautkan isian RAL L4/L5 ke referensi bila kodenya terdaftar di bawah induknya (selain itu tetap teks bebas). */
async function linkDeep(client: PoolClient, id: string) {
  await client.query("update services s set ral4_id = (select r.id from ral_references r where r.code = s.ral_l4 and r.level = 4 and r.parent_id = s.ral_id) where s.id = $1", [id]);
  await client.query("update services s set ral5_id = (select r.id from ral_references r where r.code = s.ral_l5 and r.level = 5 and r.parent_id = s.ral4_id) where s.id = $1", [id]);
}

async function linkProbis(client: PoolClient, id: string, probis: string[]) {
  await client.query("delete from service_process_businesses where service_id = $1", [id]);
  if (probis.length) await client.query("insert into service_process_businesses (service_id, process_business_id) select $1, unnest($2::uuid[])", [id, probis]);
}

const columns = (v: LayananValues) => [v.name, v.tujuan, v.fungsi, v.unit, v.target, v.metode, v.ralL4, v.ralL5, v.manfaat, v.ekonomi, v.risiko, v.mitigasi, v.kl];

async function insert(client: PoolClient, v: LayananValues, actor: Actor, status: SubmissionStatus, code?: string) {
  const ref = await ids(client, v);
  const finalCode = code || (await nextCode(client, v.ral3));
  const { rows } = await client.query(
    `insert into services (code, name, purpose, function_name, unit, target, method, ral_l4, ral_l5, benefit, economic_potential, risk, mitigation, kl,
       opd_id, period_id, ral_id, rab_id, status, created_by, submitted_by)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21) returning id`,
    [finalCode, ...columns(v), ref.opd_id, ref.period_id, ref.ral_id, ref.rab_id, status, actor.id, status === "submitted" ? actor.id : null],
  );
  const id = rows[0].id as string;
  await linkDeep(client, id);
  await linkProbis(client, id, ref.probis);
  await review(client, id, actor, null, status, status === "submitted" ? "Diajukan" : "Draf dibuat");
  return id;
}

const UPDATE = `update services set name=$2, purpose=$3, function_name=$4, unit=$5, target=$6, method=$7, ral_l4=$8, ral_l5=$9, benefit=$10,
  economic_potential=$11, risk=$12, mitigation=$13, kl=$14, opd_id=$15, period_id=$16, ral_id=$17, rab_id=$18, ral_review = false, updated_at = now()`;

export function createLayanan(v: LayananValues, actor: Actor, submit: boolean) {
  return tx((client) => insert(client, v, actor, submit ? "submitted" : "draft"));
}

export function updateLayanan(id: string, v: LayananValues, actor: Actor, submit: boolean) {
  return tx(async (client) => {
    const ref = await ids(client, v);
    const { rows } = await client.query("select status::text from services where id = $1 for update", [id]);
    const from = rows[0]?.status as SubmissionStatus | undefined;
    if (!from) throw new Error("Layanan tidak ditemukan.");
    const to: SubmissionStatus = submit ? "submitted" : from;
    await client.query(
      `${UPDATE}, status = $19::text::submission_status, submitted_by = case when $19::text = 'submitted' then $20::uuid else submitted_by end where id = $1`,
      [id, ...columns(v), ref.opd_id, ref.period_id, ref.ral_id, ref.rab_id, to, actor.id],
    );
    await linkDeep(client, id);
    await linkProbis(client, id, ref.probis);
    if (to !== from) await review(client, id, actor, from, to, "Diajukan");
    return id;
  });
}

export async function deleteLayanan(id: string) {
  await db().query("delete from services where id = $1", [id]);
}

/** Ubah status alur verifikasi dan catat riwayatnya (kunci optimis pada status asal). */
export function transition(id: string, from: SubmissionStatus, to: SubmissionStatus, actor: Actor, note?: string | null) {
  return tx(async (client) => {
    const who = to === "verified" ? "verified_by = $4" : to === "approved" ? "approved_by = $4, approved_at = now()" : to === "submitted" ? "submitted_by = $4" : null;
    const { rowCount } = await client.query(
      `update services set status = $3, updated_at = now() ${who ? `, ${who}` : ""} where id = $1 and status::text = $2`,
      who ? [id, from, to, actor.id] : [id, from, to],
    );
    if (!rowCount) throw new Error("Status layanan sudah berubah. Muat ulang halaman.");
    await review(client, id, actor, from, to, note);
  });
}

/** Simpan hasil impor dalam satu transaksi. Baris ber-ID yang sudah ada diperbarui bila `update` aktif. */
export function importRows(rows: (LayananValues & { code?: string | null })[], actor: Actor, status: SubmissionStatus, update: boolean) {
  return tx(async (client) => {
    let created = 0,
      updated = 0,
      skipped = 0;
    // Satu query untuk semua ID yang sudah ada (bukan per baris).
    const codes = rows.map((r) => r.code).filter((c): c is string => !!c);
    const found = codes.length
      ? (await client.query("select s.id, s.status::text, s.code, ap.name as period from services s join architecture_periods ap on ap.id = s.period_id where s.code = any($1)", [codes])).rows
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
        await client.query(`${UPDATE} where id = $1`, [existing.id, ...columns(row), ref.opd_id, ref.period_id, ref.ral_id, ref.rab_id]);
        await linkDeep(client, existing.id);
        await linkProbis(client, existing.id, ref.probis);
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
  const { rows } = await db().query("select s.code, ap.name as period from services s join architecture_periods ap on ap.id = s.period_id where s.code = any($1)", [codes]);
  return new Set(rows.map((r) => `${r.code}|${r.period}`));
}

/** Hapus seluruh layanan contoh. */
export async function clearSamples() {
  const { rowCount } = await db().query("delete from services where is_sample");
  return rowCount ?? 0;
}
