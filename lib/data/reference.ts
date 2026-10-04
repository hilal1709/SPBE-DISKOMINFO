import { makeRabIndex, type RabNode } from "@/lib/probis/rab-index";
import type { DataInfo } from "@/lib/types";
import radReference from "./rad-reference.json";

/**
 * Referensi Domain Data (sumber: template analis "Domain Arsitektur Data dan Informasi.xlsx").
 * RAD disimpan sebagai node berbentuk RabNode agar indeksnya memakai makeRabIndex.
 */
export const sampleRad = makeRabIndex(radReference as RabNode[]);

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

/** Nama RAD L2 diawali "Data …"; nama RAL L2 tidak. */
const bare = (name: string) => name.replace(/^data\s+/i, "").toLowerCase();

/** RAL L2 tanpa padanan nama di RAD. */
const ralFallback: Record<string, string> = {
  "RAL.01.03": "RAD.09.07",
  "RAL.01.04": "RAD.02.10",
  "RAL.01.16": "RAD.02.08",
  "RAL.01.24": "RAD.09.01",
  "RAL.02.06": "RAD.09.06",
  "RAL.02.07": "RAD.09.06",
  "RAL.02.08": "RAD.09.06",
  "RAL.02.09": "RAD.09.03",
};

/** Urusan layanan (RAL L2) → kelompok data tematik (RAD L2). */
export function radForRal2(ral2: string, ralName: string | undefined) {
  const name = ralName?.toLowerCase();
  return sampleRad.level(2).find((n) => bare(n.name) === name)?.code ?? ralFallback[ral2];
}
