import { muatanConfig } from "@/lib/peta-rencana/muatan";
import type { GapRecord } from "@/lib/types";
import { gapStatusConfig, priorityConfig, ruleConfig, type GapRule } from "./rules";

/** Kolom ekspor Gap Analysis. */
export const gapColumns: { header: string; width: number; value: (r: GapRecord) => string }[] = [
  { header: "ID", width: 16, value: (r) => r.code },
  { header: "Periode", width: 12, value: (r) => r.period },
  { header: "Domain", width: 14, value: (r) => muatanConfig[r.domain].label },
  { header: "Aturan", width: 34, value: (r) => (r.rule ? (ruleConfig[r.rule as GapRule]?.label ?? r.rule) : "Manual") },
  { header: "Objek", width: 40, value: (r) => r.subjectName },
  { header: "ID Objek", width: 16, value: (r) => r.subjectCode ?? "" },
  { header: "Perangkat Daerah", width: 32, value: (r) => r.opdName ?? "" },
  { header: "Kondisi Saat Ini (AS-IS)", width: 40, value: (r) => r.asIs },
  { header: "Kondisi Target", width: 40, value: (r) => r.target },
  { header: "Rekomendasi", width: 40, value: (r) => r.rekomendasi },
  { header: "Prioritas", width: 10, value: (r) => priorityConfig[r.priority].label },
  { header: "Status", width: 16, value: (r) => gapStatusConfig[r.status].label },
  { header: "Kegiatan Peta Rencana", width: 18, value: (r) => r.roadmapCode ?? "" },
  { header: "Catatan", width: 32, value: (r) => r.note ?? "" },
];
