import type { PoolClient } from "pg";
import type { Actor } from "@/lib/access";
import { getDb } from "@/lib/db";
import type { RencanaIndicator, RencanaRecord } from "@/lib/types";
import { muatanConfig, type Muatan, type RencanaStatus } from "./muatan";
import type { IndicatorValues, RencanaValues } from "./schema";

/**
 * Akses data CMS Peta Rencana (server saja). Dikelola langsung oleh Diskominfo (Admin Operator) tanpa alur verifikasi:
 * kegiatan tersimpan langsung tayang, `status` adalah status pelaksanaan.
 */

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
  select r.id, r.code, r.name, r.year, r.sasaran, r.inisiatif, r.muatan, r.program, r.target, r.jumlah::float as jumlah, r.satuan,
         r.status, r.realisasi, r.evaluation_note, r.source, r.source_ref, src.code as deferred_from,
         o.code as opd_code, o.name as opd_name, o.id as opd_id, ap.name as period, r.updated_at, r.is_sample
  from roadmap_items r
  join opd o on o.id = r.opd_id
  join architecture_periods ap on ap.id = r.period_id
  left join roadmap_items src on src.id = r.deferred_from`;

type Row = Record<string, string | null> & { year: number; jumlah: number; updated_at: Date; is_sample: boolean };

const toRecord = (r: Row): RencanaRecord => ({
  id: r.id!,
  code: r.code!,
  name: r.name!,
  year: r.year,
  sasaran: r.sasaran!,
  inisiatif: r.inisiatif,
  muatan: r.muatan as Muatan,
  program: r.program,
  target: r.target,
  jumlah: r.jumlah,
  satuan: r.satuan!,
  status: r.status as RencanaStatus,
  realisasi: r.realisasi,
  evaluasi: r.evaluation_note,
  source: r.source as RencanaRecord["source"],
  sourceRef: r.source_ref,
  deferredFrom: r.deferred_from,
  opdId: r.opd_id!,
  opdCode: r.opd_code!,
  opdName: r.opd_name!,
  period: r.period ?? "",
  updatedAt: r.updated_at.toISOString(),
  isSample: r.is_sample,
});

export async function listRencana() {
  const { rows } = await db().query<Row>(`${SELECT} order by ap.start_year desc, r.year, r.code`);
  return rows.map(toRecord);
}

export async function getRencana(id: string) {
  const { rows } = await db().query<Row>(`${SELECT} where r.id = $1`, [id]);
  return rows[0] ? toRecord(rows[0]) : null;
}

/** Ringkasan beranda CMS: jumlah per status di periode aktif dan perubahan terbaru. */
export async function rencanaSummary() {
  const [counts, flags, recent] = await Promise.all([
    db().query(
      "select r.status, count(*)::int as n from roadmap_items r join architecture_periods ap on ap.id = r.period_id where ap.is_active group by 1",
    ),
    db().query("select count(*) filter (where is_sample)::int as samples from roadmap_items"),
    db().query("select r.id, r.name, r.status, r.updated_at, u.name as actor_name from roadmap_items r left join users u on u.id = coalesce(r.updated_by, r.created_by) order by r.updated_at desc limit 8"),
  ]);
  return {
    samples: flags.rows[0].samples as number,
    counts: Object.fromEntries(counts.rows.map((r) => [r.status, r.n])) as Partial<Record<RencanaStatus, number>>,
    recent: recent.rows.map((r) => ({
      id: r.id as string,
      name: r.name as string,
      actorName: r.actor_name as string | null,
      status: r.status as RencanaStatus,
      createdAt: (r.updated_at as Date).toISOString(),
    })),
  };
}

async function ids(client: PoolClient, v: Pick<RencanaValues, "opd" | "period">) {
  const { rows } = await client.query("select (select id from opd where code = $1) as opd_id, (select id from architecture_periods where name = $2) as period_id", [v.opd, v.period]);
  if (!rows[0].opd_id) throw new Error("Perangkat daerah tidak ditemukan.");
  if (!rows[0].period_id) throw new Error(`Periode “${v.period}” belum terdaftar. Tambahkan di Pengaturan › Periode Arsitektur.`);
  return { opd_id: rows[0].opd_id as string, period_id: rows[0].period_id as string };
}

/** ID kegiatan otomatis: GSK-PRN {singkatan muatan}.{urutan 3 digit}. */
async function nextCode(client: PoolClient, muatan: Muatan) {
  const prefix = `GSK-PRN ${muatanConfig[muatan].abbr}.`;
  const { rows } = await client.query("select code from roadmap_items where code like $1", [`${prefix}%`]);
  const max = rows.reduce((m, r) => Math.max(m, Number(String(r.code).slice(prefix.length)) || 0), 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

/** Kolom isian (urutan sama dengan $2…$16 di UPDATE). */
const columns = (v: RencanaValues) => [v.name, v.year, v.sasaran, v.inisiatif, v.muatan, v.program, v.target, v.jumlah, v.satuan, v.status, v.realisasi, v.evaluasi, v.source, v.sourceRef];
const COLS = "name, year, sasaran, inisiatif, muatan, program, target, jumlah, satuan, status, realisasi, evaluation_note, source, source_ref";
const N = COLS.split(", ").length;

export async function insertRencana(client: PoolClient, v: RencanaValues, actor: Actor, extra: { code?: string; deferredFrom?: string; sample?: boolean } = {}) {
  const ref = await ids(client, v);
  const code = extra.code || (await nextCode(client, v.muatan));
  const values = [code, ...columns(v), ref.opd_id, ref.period_id, actor.id, extra.deferredFrom ?? null, extra.sample ?? false];
  const { rows } = await client.query(
    `insert into roadmap_items (code, ${COLS}, opd_id, period_id, created_by, deferred_from, is_sample)
     values (${values.map((_, i) => `$${i + 1}`).join(",")}) returning id`,
    values,
  );
  return rows[0].id as string;
}

const UPDATE = `update roadmap_items set ${COLS.split(", ")
  .map((c, i) => `${c}=$${i + 2}`)
  .join(", ")}, opd_id=$${N + 2}, period_id=$${N + 3}, updated_by=$${N + 4}, updated_at = now()`;

export function createRencana(v: RencanaValues, actor: Actor) {
  return tx((client) => insertRencana(client, v, actor));
}

export function updateRencana(id: string, v: RencanaValues, actor: Actor) {
  return tx(async (client) => {
    const ref = await ids(client, v);
    const { rowCount } = await client.query(`${UPDATE} where id = $1`, [id, ...columns(v), ref.opd_id, ref.period_id, actor.id]);
    if (!rowCount) throw new Error("Kegiatan rencana tidak ditemukan.");
    await syncGap(client, id, v.status);
    return id;
  });
}

export function deleteRencana(id: string) {
  return tx(async (client) => {
    // Temuan gap yang diusulkan lewat kegiatan ini kembali terbuka.
    await client.query("update gap_analyses set status = 'terbuka', roadmap_item_id = null, updated_at = now() where roadmap_item_id = $1 and status = 'diusulkan'", [id]);
    await client.query("delete from roadmap_items where id = $1", [id]);
  });
}

/** Status temuan gap mengikuti kegiatan usulannya: terlaksana → ditindaklanjuti, selain itu tetap diusulkan. */
async function syncGap(client: PoolClient, id: string, status: RencanaStatus) {
  await client.query(
    `update gap_analyses set status = case when $2 = 'terlaksana' then 'ditindaklanjuti' else 'diusulkan' end, updated_at = now()
     where roadmap_item_id = $1 and status in ('diusulkan', 'ditindaklanjuti')`,
    [id, status],
  );
}

/**
 * Alihkan kegiatan ke tahun berikutnya (notulen: usulan yang tidak ter-cover tahun berjalan dipindah ke periode
 * berikutnya). Kegiatan asal ditandai "ditunda", salinannya dibuat di tahun berikutnya — atau di periode berikutnya
 * bila sudah tahun terakhir periode.
 */
export function deferRencana(id: string, actor: Actor) {
  return tx(async (client) => {
    const { rows } = await client.query(
      `select r.*, ap.end_year, o.code as opd_code, ap.name as period_name from roadmap_items r
       join architecture_periods ap on ap.id = r.period_id join opd o on o.id = r.opd_id where r.id = $1 for update of r`,
      [id],
    );
    const r = rows[0];
    if (!r) throw new Error("Kegiatan rencana tidak ditemukan.");
    if (r.status === "terlaksana" || r.status === "batal") throw new Error("Kegiatan yang sudah terlaksana atau batal tidak bisa dialihkan.");
    const year = r.year + 1;
    let period = r.period_name as string;
    if (year > r.end_year) {
      const next = await client.query("select name from architecture_periods where start_year <= $1 and end_year >= $1", [year]);
      if (!next.rows[0]) throw new Error(`Periode yang memuat tahun ${year} belum terdaftar. Tambahkan di Pengaturan › Periode Arsitektur.`);
      period = next.rows[0].name;
    }
    await client.query("update roadmap_items set status = 'ditunda', updated_by = $2, updated_at = now() where id = $1", [id, actor.id]);
    const newId = await insertRencana(
      client,
      {
        opd: r.opd_code, period, year, sasaran: r.sasaran, inisiatif: r.inisiatif, muatan: r.muatan, program: r.program, name: r.name, target: r.target,
        jumlah: Number(r.jumlah), satuan: r.satuan, status: "direncanakan", realisasi: null, evaluasi: null, source: "usulan_tertunda", sourceRef: r.code,
      },
      actor,
      { deferredFrom: id, sample: r.is_sample },
    );
    return { newId, previous: r.status as RencanaStatus, year, period };
  });
}

/** Batalkan pengalihan: hapus salinan dan kembalikan status kegiatan asal. */
export function undoDefer(id: string, newId: string, previous: RencanaStatus) {
  return tx(async (client) => {
    await client.query("delete from roadmap_items where id = $1 and deferred_from = $2", [newId, id]);
    await client.query("update roadmap_items set status = $2, updated_at = now() where id = $1", [id, previous]);
  });
}

/** Simpan hasil impor dalam satu transaksi. Baris ber-ID yang sudah ada diperbarui bila `update` aktif. */
export function importRows(rows: (RencanaValues & { code?: string | null })[], actor: Actor, update: boolean) {
  return tx(async (client) => {
    let created = 0,
      updated = 0,
      skipped = 0;
    const codes = rows.map((r) => r.code).filter((c): c is string => !!c);
    const found = codes.length
      ? (await client.query("select r.id, r.code, ap.name as period from roadmap_items r join architecture_periods ap on ap.id = r.period_id where r.code = any($1)", [codes])).rows
      : [];
    const byKey = new Map(found.map((r) => [`${r.code}|${r.period}`, r.id as string]));
    for (const row of rows) {
      const existing = row.code ? byKey.get(`${row.code}|${row.period}`) : undefined;
      if (existing) {
        if (!update) {
          skipped++;
          continue;
        }
        const ref = await ids(client, row);
        await client.query(`${UPDATE} where id = $1`, [existing, ...columns(row), ref.opd_id, ref.period_id, actor.id]);
        updated++;
      } else {
        await insertRencana(client, row, actor, { code: row.code ?? undefined });
        created++;
      }
    }
    return { created, updated, skipped };
  });
}

/** Pasangan "ID|periode" yang sudah ada (pratinjau impor). */
export async function existingCodes(codes: string[]) {
  if (!codes.length) return new Set<string>();
  const { rows } = await db().query("select r.code, ap.name as period from roadmap_items r join architecture_periods ap on ap.id = r.period_id where r.code = any($1)", [codes]);
  return new Set(rows.map((r) => `${r.code}|${r.period}`));
}

/** Hapus seluruh kegiatan & indikator contoh. */
export async function clearSamples() {
  const [items, indicators] = await Promise.all([
    db().query("delete from roadmap_items where is_sample"),
    db().query("delete from roadmap_indicators where is_sample"),
  ]);
  return (items.rowCount ?? 0) + (indicators.rowCount ?? 0);
}

/* ── Indikator & target ── */

export async function listIndicatorsCms(): Promise<RencanaIndicator[]> {
  const { rows } = await db().query(
    "select i.id, ap.name as period, i.sasaran, i.inisiatif, i.indikator, i.targets from roadmap_indicators i join architecture_periods ap on ap.id = i.period_id order by ap.start_year desc, i.sasaran, i.indikator",
  );
  return rows.map((r) => ({ id: r.id, period: r.period, sasaran: r.sasaran, inisiatif: r.inisiatif, indikator: r.indikator, targets: r.targets ?? {} }));
}

export async function saveIndicator(v: IndicatorValues, { sample = false } = {}) {
  const { rows } = await db().query("select id from architecture_periods where name = $1", [v.period]);
  if (!rows[0]) throw new Error(`Periode “${v.period}” belum terdaftar.`);
  const targets = JSON.stringify(Object.fromEntries(Object.entries(v.targets).filter(([, t]) => t)));
  if (v.id) {
    await db().query("update roadmap_indicators set period_id=$2, sasaran=$3, inisiatif=$4, indikator=$5, targets=$6, updated_at=now() where id=$1", [
      v.id, rows[0].id, v.sasaran, v.inisiatif, v.indikator, targets,
    ]);
    return v.id;
  }
  const res = await db().query(
    `insert into roadmap_indicators (period_id, sasaran, inisiatif, indikator, targets, is_sample) values ($1,$2,$3,$4,$5,$6)
     on conflict (period_id, sasaran, indikator) do update set inisiatif = excluded.inisiatif, targets = excluded.targets, updated_at = now() returning id`,
    [rows[0].id, v.sasaran, v.inisiatif, v.indikator, targets, sample],
  );
  return res.rows[0].id as string;
}

export async function deleteIndicator(id: string) {
  await db().query("delete from roadmap_indicators where id = $1", [id]);
}
