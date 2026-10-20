import type { RabIndex } from "@/lib/probis/rab-index";
import type { Aplikasi } from "@/lib/types";

/** `period` selalu satu periode (single-select), default periode aktif. `pd` = unit operasional teknologi. */
export type AplikasiFilter = { pd: string[]; basis: string[]; lisensi: string[]; kepemilikan: string[]; period: string; raa1: string[]; raa2: string[] };

export const emptyFilter = (period: string): AplikasiFilter => ({ pd: [], basis: [], lisensi: [], kepemilikan: [], period, raa1: [], raa2: [] });

const listKeys = ["pd", "basis", "lisensi", "kepemilikan", "raa1", "raa2"] as const;
const field = { pd: "operasional", basis: "basis", lisensi: "lisensi", kepemilikan: "kepemilikan", raa1: "raa1", raa2: "raa2" } as const;

export function filterAplikasi(rows: Aplikasi[], f: AplikasiFilter) {
  return rows.filter((a) => a.period === f.period && listKeys.every((key) => !f[key].length || f[key].includes(a[field[key]])));
}

export function activeFilterCount(f: AplikasiFilter, defaultPeriod: string) {
  return listKeys.filter((key) => f[key].length).length + (f.period !== defaultPeriod ? 1 : 0);
}

export function countBy<K extends "operasional" | "basis" | "lisensi" | "kepemilikan" | "raa2" | "bahasa">(rows: Aplikasi[], key: K) {
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row[key], (counts.get(row[key]) ?? 0) + 1);
  return counts;
}

/** Pilihan RAA bertingkat: L2 dibatasi L1 terpilih. */
export function raaOptions(f: AplikasiFilter, raa: RabIndex) {
  return { level1: raa.level(1), level2: raa.level(2).filter((n) => !f.raa1.length || f.raa1.includes(n.parent!)) };
}

/** Serialisasi filter ke/dari query string agar tampilan bisa dibagikan. */
export function filterFromParams(params: URLSearchParams, defaultPeriod: string): AplikasiFilter {
  const list = (key: string) => params.get(key)?.split(",").filter(Boolean) ?? [];
  return { pd: list("pd"), basis: list("basis"), lisensi: list("lisensi"), kepemilikan: list("kepemilikan"), period: params.get("periode") ?? defaultPeriod, raa1: list("raa1"), raa2: list("raa2") };
}

/** Buang nilai URL yang tidak dikenal (tautan lama/salah ketik) agar tidak menjadi chip kosong. */
export function sanitizeFilter(
  f: AplikasiFilter,
  valid: { periods: string[]; defaultPeriod: string; pd: Set<string>; basis: Set<string>; lisensi: Set<string>; kepemilikan: Set<string>; raa: RabIndex },
): AplikasiFilter {
  const raaLevel = (level: number) => (code: string) => valid.raa.byCode.get(code)?.level === level;
  const raa1 = f.raa1.filter(raaLevel(1));
  return {
    pd: f.pd.filter((v) => valid.pd.has(v)),
    basis: f.basis.filter((v) => valid.basis.has(v)),
    lisensi: f.lisensi.filter((v) => valid.lisensi.has(v)),
    kepemilikan: f.kepemilikan.filter((v) => valid.kepemilikan.has(v)),
    period: valid.periods.includes(f.period) ? f.period : valid.defaultPeriod,
    raa1,
    raa2: f.raa2.filter((code) => raaLevel(2)(code) && (!raa1.length || raa1.includes(valid.raa.byCode.get(code)!.parent!))),
  };
}

export function filterToParams(f: AplikasiFilter, defaultPeriod: string) {
  const params = new URLSearchParams();
  for (const key of listKeys) if (f[key].length) params.set(key, f[key].join(","));
  if (f.period !== defaultPeriod) params.set("periode", f.period);
  return params;
}
