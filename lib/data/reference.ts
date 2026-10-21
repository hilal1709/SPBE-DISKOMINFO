import type { RabNode } from "@/lib/probis/rab-index";
import type { DataInfo } from "@/lib/types";

/**
 * Referensi Domain Data (sumber: template analis "Domain Arsitektur Data dan Informasi.xlsx").
 * RAD disimpan sebagai node berbentuk RabNode agar indeksnya memakai makeRabIndex.
 */
/** RAD yang boleh dipilih sebagai klasifikasi data: Level 3, atau Level 2 yang tidak memiliki turunan. */
export const isRadLeaf = (rad: { byCode: Map<string, RabNode>; children: (code: string) => RabNode[] }, code: string | null | undefined) => {
  const node = code ? rad.byCode.get(code) : undefined;
  return !!node && (node.level === 3 || (node.level === 2 && !rad.children(node.code).length));
};

export type Sifat = DataInfo["sifat"];
export const sifatOptions: { value: Sifat; label: string }[] = [
  { value: "terbuka", label: "Terbuka" },
  { value: "terbatas", label: "Terbatas" },
  { value: "tertutup", label: "Tertutup" },
];
export const sifatLabel = Object.fromEntries(sifatOptions.map((o) => [o.value, o.label])) as Record<Sifat, string>;

export type Jenis = DataInfo["jenis"];
export const jenisOptions: { value: Jenis; label: string }[] = [
  { value: "statistik", label: "Statistik" },
  { value: "geopasial", label: "Geopasial" },
  { value: "keuangan", label: "Keuangan" },
  { value: "lainnya", label: "Lainnya" },
];
export const jenisLabel = Object.fromEntries(jenisOptions.map((o) => [o.value, o.label])) as Record<Jenis, string>;

/** Pilihan "Validitas Data" template, urut dari paling sering diperbarui. */
export const validitasOptions = ["Realtime", "Harian", "Mingguan", "Bulanan", "Tiga Bulanan", "Enam Bulanan", "Tahunan", "Dua Tahunan", "Tiga Tahunan", "Lima Tahunan", "Lainnya"];

/** Dependensi Keamanan SPBE di template (urutan kolom). Diisi kode kegiatan keamanan (lib/keamanan/link.ts). */
export const securityFields = [
  { key: "standar", label: "Standar Teknis dan Prosedur Keamanan SPBE" },
  { key: "audit", label: "Audit Keamanan SPBE" },
  { key: "kerentanan", label: "Identifikasi Kerentanan Keamanan SPBE" },
  { key: "kelaikan", label: "Kelaikan Keamanan SPBE" },
  { key: "edukasi", label: "Edukasi Kesadaran Keamanan SPBE" },
  { key: "insiden", label: "Penanganan Insiden Keamanan SPBE" },
  { key: "peningkatan", label: "Peningkatan Keamanan SPBE" },
] as const;
export type SecurityKey = (typeof securityFields)[number]["key"];
export type Security = Partial<Record<SecurityKey, string[]>>;
