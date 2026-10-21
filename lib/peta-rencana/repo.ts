import { getDb } from "@/lib/db";
import type { Rencana, RencanaIndicator } from "@/lib/types";

/** Akses data Peta Rencana untuk dashboard publik (server saja). */

function db() {
  const pool = getDb();
  if (!pool) throw new Error("Database belum dikonfigurasi (DATABASE_URL).");
  return pool;
}

/** Seluruh kegiatan dan indikator. `sample` bila isinya data contoh. */
export async function listPublicRencana(): Promise<{ rows: Rencana[]; indicators: RencanaIndicator[]; sample: boolean }> {
  const [items, inds] = await Promise.all([
    db().query(
      `select r.code, r.name, o.code as opd, ap.name as period, r.year, r.sasaran, r.inisiatif, r.muatan, r.program, r.target, r.jumlah::float as jumlah,
              r.satuan, r.status, r.realisasi, r.evaluation_note, r.source, r.source_ref, src.code as deferred_from, r.is_sample
       from roadmap_items r
       join opd o on o.id = r.opd_id
       join architecture_periods ap on ap.id = r.period_id
       left join roadmap_items src on src.id = r.deferred_from`,
    ),
    db().query("select i.id, ap.name as period, i.sasaran, i.inisiatif, i.indikator, i.targets from roadmap_indicators i join architecture_periods ap on ap.id = i.period_id"),
  ]);
  return {
    rows: items.rows.map((r) => ({
      id: r.code, name: r.name, opd: r.opd, period: r.period, year: r.year, sasaran: r.sasaran, inisiatif: r.inisiatif, muatan: r.muatan, program: r.program,
      target: r.target, jumlah: r.jumlah, satuan: r.satuan, status: r.status, realisasi: r.realisasi, evaluasi: r.evaluation_note, source: r.source,
      sourceRef: r.source_ref, deferredFrom: r.deferred_from,
    })),
    indicators: inds.rows.map((r) => ({ id: r.id, period: r.period, sasaran: r.sasaran, inisiatif: r.inisiatif, indikator: r.indikator, targets: r.targets ?? {} })),
    sample: items.rows.some((r) => r.is_sample),
  };
}
