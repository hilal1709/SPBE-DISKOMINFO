import type { KegiatanKeamanan } from "@/lib/types";

/** `period` selalu satu periode (single-select), default periode aktif. `tahun` = tahun kegiatan. */
export type KeamananFilter = { pd: string[]; jenis: string[]; tahun: string[]; period: string };

export const emptyFilter = (period: string): KeamananFilter => ({ pd: [], jenis: [], tahun: [], period });

const yearOf = (r: KegiatanKeamanan) => r.tanggal?.slice(0, 4) ?? "";

export function filterKeamanan(rows: KegiatanKeamanan[], f: KeamananFilter) {
  return rows.filter((r) => r.period === f.period && (!f.pd.length || f.pd.includes(r.opd)) && (!f.jenis.length || f.jenis.includes(r.jenis)) && (!f.tahun.length || f.tahun.includes(yearOf(r))));
}

export const activeFilterCount = (f: KeamananFilter, defaultPeriod: string) => [f.pd, f.jenis, f.tahun].filter((l) => l.length).length + (f.period !== defaultPeriod ? 1 : 0);

/** Tahun-tahun dalam periode "2025–2029". */
export const yearsOf = (period: string) => {
  const [start, end] = period.split(/[–-]/).map(Number);
  return start && end ? Array.from({ length: end - start + 1 }, (_, i) => String(start + i)) : [];
};

export function filterFromParams(params: URLSearchParams, defaultPeriod: string): KeamananFilter {
  const list = (key: string) => params.get(key)?.split(",").filter(Boolean) ?? [];
  return { pd: list("pd"), jenis: list("kegiatan"), tahun: list("tahun"), period: params.get("periode") ?? defaultPeriod };
}

/** Buang nilai URL yang tidak dikenal (tautan lama/salah ketik) agar tidak menjadi chip kosong. */
export function sanitizeFilter(f: KeamananFilter, valid: { periods: string[]; defaultPeriod: string; pd: Set<string>; jenis: Set<string> }): KeamananFilter {
  const period = valid.periods.includes(f.period) ? f.period : valid.defaultPeriod;
  const years = new Set(yearsOf(period));
  return { pd: f.pd.filter((v) => valid.pd.has(v)), jenis: f.jenis.filter((v) => valid.jenis.has(v)), tahun: f.tahun.filter((v) => years.has(v)), period };
}

export function filterToParams(f: KeamananFilter, defaultPeriod: string) {
  const params = new URLSearchParams();
  if (f.pd.length) params.set("pd", f.pd.join(","));
  if (f.jenis.length) params.set("kegiatan", f.jenis.join(","));
  if (f.tahun.length) params.set("tahun", f.tahun.join(","));
  if (f.period !== defaultPeriod) params.set("periode", f.period);
  return params;
}
