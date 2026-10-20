import { securityFields } from "@/lib/data/reference";
import type { RabIndex } from "@/lib/probis/rab-index";
import { reviewLabel } from "@/lib/probis/reference";
import type { InfrastrukturRecord } from "@/lib/types";
import { jenisConfig, kepemilikanLabel, relasiLabel, type InfraJenis } from "./jenis";

/**
 * Kolom ekspor per komponen (satu sheet per komponen). Header mengikuti istilah template analis dan bisa dibaca
 * ulang oleh lib/infrastruktur/import.ts, sehingga hasil ekspor dapat langsung diimpor kembali.
 */
export type Column = { header: string; width: number; value: (r: InfrastrukturRecord, rai: RabIndex) => string };

const links = (items: { id: string; name: string }[]) => items.map((p) => `${p.id} ${p.name}`).join("\n");
/** Sel referensi seperti template: "KODE NAMA". */
const refCell = (code: string | null, rai: RabIndex) => (code ? `${code} ${(rai.byCode.get(code)?.name ?? "").toUpperCase()}`.trim() : "");

export function columnsFor(jenis: InfraJenis, { status = true }: { status?: boolean } = {}): Column[] {
  const cfg = jenisConfig[jenis];
  const cols: Column[] = [
    { header: cfg.nameHeader, width: 34, value: (r) => r.name },
    { header: "ID", width: 18, value: (r) => r.code },
  ];
  // Deskripsi selalu diekspor (opsional untuk Fasilitas Komputasi yang templatnya tanpa kolom deskripsi).
  cols.push({ header: "Deskripsi", width: 44, value: (r) => r.deskripsi ?? "" });
  if (cfg.common.includes("pemilik")) cols.push({ header: "Nama Pemilik", width: 26, value: (r) => r.pemilik ?? "" });
  if (cfg.common.includes("kepemilikan")) cols.push({ header: "Status Kepemilikan", width: 18, value: (r) => (r.kepemilikan ? kepemilikanLabel[r.kepemilikan] : "") });
  if (cfg.common.includes("pengelola")) cols.push({ header: "Unit Pengelola", width: 28, value: (r) => r.pengelola ?? "" });
  for (const a of cfg.attrs) cols.push({ header: a.label.charAt(0).toUpperCase() + a.label.slice(1), width: a.type === "textarea" ? 40 : 22, value: (r) => r.atribut[a.key] ?? "" });
  cols.push(
    { header: "→ RAI Level 1 (Dependency)", width: 26, value: (r, rai) => refCell(r.rai1, rai) },
    { header: "→ RAI Level 2 (Dependency)", width: 34, value: (r, rai) => refCell(r.rai2, rai) },
    { header: "→ RAI Level 3 (Dependency)", width: 26, value: (r, rai) => refCell(r.rai3, rai) },
  );
  for (const rel of [...cfg.relasi, ...(cfg.fungsi ?? [])]) {
    const header = `→ ${relasiLabel[rel]} (${cfg.fungsi?.includes(rel as InfraJenis) ? "Function" : "Dependency"})`;
    if (rel === "aplikasi") cols.push({ header, width: 36, value: (r) => links(r.aplikasi) });
    else if (rel === "data") cols.push({ header, width: 36, value: (r) => links(r.data) });
    else if (rel === "probis") cols.push({ header, width: 36, value: (r) => links(r.probis) });
    else cols.push({ header, width: 30, value: (r) => r.relasi.filter((x) => x.jenis === rel).map((x) => x.name).join("\n") });
  }
  for (const f of securityFields) cols.push({ header: `→ ${f.label} (Dependency)`, width: 28, value: (r) => (r.security[f.key] ?? []).join("\n") });
  cols.push({ header: "→ Instansi (Dependency)", width: 32, value: (r) => r.opdName }, { header: "Periode", width: 12, value: (r) => r.period });
  if (status) cols.push({ header: "Status Verifikasi", width: 16, value: (r) => reviewLabel[r.status] });
  return cols;
}
