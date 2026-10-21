import type { PoolClient } from "pg";
import type { Actor } from "@/lib/access";
import { getDb } from "@/lib/db";
import { insertRencana } from "@/lib/peta-rencana/cms-repo";
import { muatanConfig, type Muatan } from "@/lib/peta-rencana/muatan";
import type { RencanaValues } from "@/lib/peta-rencana/schema";
import type { GapRecord } from "@/lib/types";
import { detectGaps } from "./detect";
import { ruleConfig, type GapPriority, type GapStatus } from "./rules";
import type { GapValues } from "./schema";
import { cached, TAGS } from "@/lib/cache";

/** Akses data Gap Analysis (server saja). Dikelola Diskominfo (Admin Operator), tanpa alur verifikasi. */

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
  select g.id, g.code, ap.name as period, g.opd_id, o.name as opd_name, g.domain, g.rule, g.subject_code, g.subject_name, g.sasaran,
         g.as_is, g.target, g.rekomendasi, g.priority, g.status, g.note, g.roadmap_item_id, r.code as roadmap_code, r.status as roadmap_status,
         g.updated_at, g.is_sample
  from gap_analyses g
  join architecture_periods ap on ap.id = g.period_id
  left join opd o on o.id = g.opd_id
  left join roadmap_items r on r.id = g.roadmap_item_id`;

type Row = Record<string, string | null> & { updated_at: Date; is_sample: boolean };

const toRecord = (r: Row): GapRecord => ({
  id: r.id!,
  code: r.code!,
  period: r.period!,
  opdId: r.opd_id,
  opdName: r.opd_name,
  domain: r.domain as Muatan,
  rule: r.rule,
  subjectCode: r.subject_code,
  subjectName: r.subject_name!,
  sasaran: r.sasaran,
  asIs: r.as_is!,
  target: r.target!,
  rekomendasi: r.rekomendasi!,
  priority: r.priority as GapPriority,
  status: r.status as GapStatus,
  note: r.note,
  roadmapId: r.roadmap_item_id,
  roadmapCode: r.roadmap_code,
  roadmapStatus: r.roadmap_status as GapRecord["roadmapStatus"],
  updatedAt: r.updated_at.toISOString(),
  isSample: r.is_sample,
});

const order = "order by case g.priority when 'tinggi' then 0 when 'sedang' then 1 else 2 end, g.domain, g.subject_name";

async function loadListGaps() {
  const { rows } = await db().query<Row>(`${SELECT} ${order}`);
  return rows.map(toRecord);
}

export async function getGap(id: string) {
  const { rows } = await db().query<Row>(`${SELECT} where g.id = $1`, [id]);
  return rows[0] ? toRecord(rows[0]) : null;
}

/** Ringkasan periode aktif (beranda CMS & peringatan di Peta Rencana). */
async function loadGapSummary() {
  const { rows } = await db().query(
    `select g.status, count(*)::int as n, count(*) filter (where g.priority = 'tinggi')::int as high, count(*) filter (where g.is_sample)::int as samples
     from gap_analyses g join architecture_periods ap on ap.id = g.period_id where ap.is_active group by 1`,
  );
  const { rows: all } = await db().query("select count(*) filter (where is_sample)::int as samples from gap_analyses");
  const by = Object.fromEntries(rows.map((r) => [r.status, r])) as Partial<Record<GapStatus, { n: number; high: number }>>;
  return { counts: Object.fromEntries(rows.map((r) => [r.status, r.n])) as Partial<Record<GapStatus, number>>, openHigh: by.terbuka?.high ?? 0, samples: all[0].samples as number };
}

async function periodId(client: PoolClient, period: string) {
  const { rows } = await client.query("select id from architecture_periods where name = $1", [period]);
  if (!rows[0]) throw new Error(`Periode “${period}” belum terdaftar.`);
  return rows[0].id as string;
}

/** Penomoran GSK-GAP {singkatan domain}.{urutan} untuk satu transaksi (banyak temuan sekaligus). */
async function codeMaker(client: PoolClient) {
  const { rows } = await client.query("select code from gap_analyses");
  const max = new Map<string, number>();
  for (const { code } of rows) {
    const m = String(code).match(/^GSK-GAP ([A-Z]+)\.(\d+)$/);
    if (m) max.set(m[1]!, Math.max(max.get(m[1]!) ?? 0, Number(m[2])));
  }
  return (domain: Muatan) => {
    const abbr = muatanConfig[domain].abbr;
    const n = (max.get(abbr) ?? 0) + 1;
    max.set(abbr, n);
    return `GSK-GAP ${abbr}.${String(n).padStart(3, "0")}`;
  };
}

/**
 * Pindai kesenjangan satu periode. Temuan baru disimpan terbuka; temuan terbuka yang masih ada diperbarui kondisinya;
 * temuan terbuka yang subjeknya sudah memenuhi target ditutup otomatis. Temuan yang diusulkan/diabaikan tidak disentuh.
 */
export function scanGaps(period: string, actor: Actor | null, { sample = false } = {}) {
  return tx(async (client) => {
    const pid = await periodId(client, period);
    const findings = await detectGaps(client, pid);
    const { rows: existing } = await client.query("select id, rule, subject_code, status from gap_analyses where period_id = $1 and rule is not null", [pid]);
    const byKey = new Map(existing.map((r) => [`${r.rule}|${r.subject_code}`, r as { id: string; status: GapStatus }]));
    const next = await codeMaker(client);
    const seen = new Set(findings.map((f) => `${f.rule}|${f.subject_code}`));
    // Ratusan temuan sekaligus: simpan massal lewat unnest agar satu pemindaian = beberapa query saja.
    const fresh = findings.filter((f) => !byKey.has(`${f.rule}|${f.subject_code}`));
    const open = findings.flatMap((f) => {
      const found = byKey.get(`${f.rule}|${f.subject_code}`);
      return found?.status === "terbuka" ? [{ ...f, id: found.id }] : [];
    });
    if (fresh.length) {
      const col = <K extends keyof (typeof fresh)[number]>(k: K) => fresh.map((f) => f[k]);
      await client.query(
        `insert into gap_analyses (code, opd_id, domain, rule, subject_code, subject_name, sasaran, as_is, target, rekomendasi, priority, period_id, created_by, is_sample)
         select t.*, $12::uuid, $13::uuid, $14::boolean
         from unnest($1::text[], $2::uuid[], $3::text[], $4::text[], $5::text[], $6::text[], $7::text[], $8::text[], $9::text[], $10::text[], $11::text[])
           as t(code, opd_id, domain, rule, subject_code, subject_name, sasaran, as_is, target, rekomendasi, priority)`,
        [
          fresh.map((f) => next(ruleConfig[f.rule].domain)), col("opd_id"), fresh.map((f) => ruleConfig[f.rule].domain), col("rule"), col("subject_code"), col("subject_name"),
          col("sasaran"), col("as_is"), fresh.map((f) => ruleConfig[f.rule].target), col("rekomendasi"), col("priority"), pid, actor?.id ?? null, sample,
        ],
      );
    }
    if (open.length)
      await client.query(
        `update gap_analyses g set subject_name = v.subject_name, sasaran = coalesce(v.sasaran, g.sasaran), as_is = v.as_is, opd_id = v.opd_id, updated_at = now()
         from unnest($1::uuid[], $2::text[], $3::text[], $4::text[], $5::uuid[]) as v(id, subject_name, sasaran, as_is, opd_id) where g.id = v.id`,
        [open.map((f) => f.id), open.map((f) => f.subject_name), open.map((f) => f.sasaran), open.map((f) => f.as_is), open.map((f) => f.opd_id)],
      );
    const created = fresh.length;
    const updated = open.length;
    const resolved = existing.filter((r) => r.status === "terbuka" && !seen.has(`${r.rule}|${r.subject_code}`)).map((r) => r.id);
    if (resolved.length)
      await client.query("update gap_analyses set status = 'ditindaklanjuti', note = 'Tertutup otomatis: kondisi target terpenuhi saat pemindaian', updated_at = now() where id = any($1)", [resolved]);
    return { created, updated, closed: resolved.length, total: findings.length };
  });
}

async function opdId(client: PoolClient, code: string | null) {
  if (!code) return null;
  const { rows } = await client.query("select id from opd where code = $1", [code]);
  return (rows[0]?.id as string | undefined) ?? null;
}

/** Simpan temuan manual (baru) atau ubah isian temuan yang ada. */
export function saveGap(v: GapValues, actor: Actor, id?: string) {
  return tx(async (client) => {
    const [pid, opd] = await Promise.all([periodId(client, v.period), opdId(client, v.opd)]);
    const values = [pid, opd, v.domain, v.subjectName, v.sasaran, v.asIs, v.target, v.rekomendasi, v.priority, actor.id];
    if (id) {
      const { rowCount } = await client.query(
        "update gap_analyses set period_id=$2, opd_id=$3, domain=$4, subject_name=$5, sasaran=$6, as_is=$7, target=$8, rekomendasi=$9, priority=$10, updated_by=$11, updated_at=now() where id=$1",
        [id, ...values],
      );
      if (!rowCount) throw new Error("Temuan tidak ditemukan.");
      return id;
    }
    const next = await codeMaker(client);
    const { rows } = await client.query(
      "insert into gap_analyses (code, period_id, opd_id, domain, subject_name, sasaran, as_is, target, rekomendasi, priority, created_by) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning id",
      [next(v.domain), ...values],
    );
    return rows[0].id as string;
  });
}

export async function setGapStatus(id: string, status: "terbuka" | "diabaikan", note: string | null, actor: Actor) {
  const { rowCount } = await db().query(
    "update gap_analyses set status = $2, note = $3, updated_by = $4, updated_at = now() where id = $1 and status in ('terbuka', 'diabaikan')",
    [id, status, note, actor.id],
  );
  if (!rowCount) throw new Error("Temuan yang sudah diusulkan ke Peta Rencana tidak bisa diubah statusnya di sini.");
}

export async function deleteGap(id: string) {
  const { rowCount } = await db().query("delete from gap_analyses where id = $1 and rule is null", [id]);
  if (!rowCount) throw new Error("Hanya temuan manual yang bisa dihapus; temuan otomatis cukup diabaikan.");
}

/** Jadikan temuan usulan Peta Rencana: kegiatan baru bersumber gap, temuan berstatus diusulkan. */
export function proposeToRoadmap(id: string, v: RencanaValues, actor: Actor) {
  return tx(async (client) => {
    const { rows } = await client.query("select code, status from gap_analyses where id = $1 for update", [id]);
    if (!rows[0]) throw new Error("Temuan tidak ditemukan.");
    if (rows[0].status !== "terbuka") throw new Error("Hanya temuan terbuka yang bisa diusulkan.");
    const roadmapId = await insertRencana(client, { ...v, source: "gap", sourceRef: rows[0].code }, actor);
    await client.query("update gap_analyses set status = 'diusulkan', roadmap_item_id = $2, updated_by = $3, updated_at = now() where id = $1", [id, roadmapId, actor.id]);
    return roadmapId;
  });
}

export async function clearSamples() {
  const { rowCount } = await db().query("delete from gap_analyses where is_sample");
  return rowCount ?? 0;
}

/** Bacaan ber-cache (dibagi semua request, dibuang saat CMS menyimpan). */
export const gapSummary = cached(loadGapSummary, "gap/cms-repo:gapSummary", [TAGS.content]);
export const listGaps = cached(loadListGaps, "gap/cms-repo:listGaps", [TAGS.content]);
