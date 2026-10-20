import { reviewLabel } from "@/lib/probis/reference";
import type { KeamananRecord } from "@/lib/types";
import { kegiatanConfig, type Kegiatan } from "./jenis";

/** Kolom ekspor per kegiatan (satu sheet per kegiatan); header bisa dibaca ulang oleh lib/keamanan/import.ts. */
export type Column = { header: string; width: number; value: (r: KeamananRecord) => string };

export function columnsFor(jenis: Kegiatan, { status = true }: { status?: boolean } = {}): Column[] {
  const cfg = kegiatanConfig[jenis];
  const cols: Column[] = [
    { header: cfg.nameHeader, width: 44, value: (r) => r.name },
    { header: "ID", width: 18, value: (r) => r.code },
    { header: "Deskripsi", width: 48, value: (r) => r.deskripsi ?? "" },
    { header: cfg.dateLabel.charAt(0).toUpperCase() + cfg.dateLabel.slice(1), width: 16, value: (r) => r.tanggal ?? "" },
    ...cfg.attrs.map((a) => ({ header: a.label.charAt(0).toUpperCase() + a.label.slice(1), width: a.type === "textarea" ? 44 : 22, value: (r: KeamananRecord) => r.atribut[a.key] ?? "" })),
    { header: "→ Instansi (Dependency)", width: 32, value: (r) => r.opdName },
    { header: "Periode", width: 12, value: (r) => r.period },
  ];
  if (status) cols.push({ header: "Status Verifikasi", width: 16, value: (r) => reviewLabel[r.status] });
  return cols;
}
