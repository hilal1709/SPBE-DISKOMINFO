import type { RencanaIndicator, RencanaRecord } from "@/lib/types";
import { muatanConfig, sourceLabel, statusConfig } from "./muatan";

/** Kolom ekspor kegiatan Peta Rencana; header bisa dibaca ulang oleh lib/peta-rencana/import.ts. */
export type Column<R> = { header: string; width: number; value: (r: R) => string | number };

export const rencanaColumns: Column<RencanaRecord>[] = [
  { header: "ID", width: 16, value: (r) => r.code },
  { header: "Sasaran", width: 44, value: (r) => r.sasaran },
  { header: "Inisiatif Strategis", width: 32, value: (r) => r.inisiatif ?? "" },
  { header: "Muatan", width: 14, value: (r) => muatanConfig[r.muatan].label },
  { header: "Program", width: 36, value: (r) => r.program ?? "" },
  { header: "Kegiatan", width: 44, value: (r) => r.name },
  { header: "Perangkat Daerah", width: 32, value: (r) => r.opdName },
  { header: "Tahun", width: 8, value: (r) => r.year },
  { header: "Periode", width: 12, value: (r) => r.period },
  { header: "Target", width: 32, value: (r) => r.target ?? "" },
  { header: "Jumlah", width: 8, value: (r) => r.jumlah },
  { header: "Satuan", width: 10, value: (r) => r.satuan },
  { header: "Status", width: 14, value: (r) => statusConfig[r.status].label },
  { header: "Realisasi", width: 32, value: (r) => r.realisasi ?? "" },
  { header: "Catatan Evaluasi", width: 32, value: (r) => r.evaluasi ?? "" },
  { header: "Asal Usulan", width: 18, value: (r) => sourceLabel[r.source] },
  { header: "Referensi Asal", width: 16, value: (r) => r.sourceRef ?? "" },
];

/** Kolom sheet indikator: target per tahun periode. */
export const indicatorColumns = (years: string[]): Column<RencanaIndicator>[] => [
  { header: "Periode", width: 12, value: (r) => r.period },
  { header: "Sasaran", width: 44, value: (r) => r.sasaran },
  { header: "Inisiatif Strategis", width: 32, value: (r) => r.inisiatif ?? "" },
  { header: "Indikator", width: 36, value: (r) => r.indikator },
  ...years.map((y) => ({ header: `Target ${y}`, width: 12, value: (r: RencanaIndicator) => r.targets[y] ?? "" })),
];
