import type { Rencana } from "@/lib/types";
import type { RencanaStatus } from "./muatan";

/** `period` selalu satu periode (single-select), default periode aktif. */
export type RencanaFilter = { period: string; tahun: string[]; pd: string[]; sasaran: string[]; muatan: string[]; status: string[] };

export const emptyFilter = (period: string): RencanaFilter => ({ period, tahun: [], pd: [], sasaran: [], muatan: [], status: [] });

/** Kartu memilih satu status; klik ulang melepasnya tanpa menghapus filter lain. */
export function withRencanaStatus(filter: RencanaFilter, status: RencanaStatus): RencanaFilter {
  return { ...filter, status: filter.status.length === 1 && filter.status[0] === status ? [] : [status] };
}

const lists = ["tahun", "pd", "sasaran", "muatan", "status"] as const;
/** Nama parameter URL per filter (sasaran disimpan sebagai indeks agar URL pendek). */
const param: Record<(typeof lists)[number], string> = { tahun: "tahun", pd: "pd", sasaran: "sasaran", muatan: "muatan", status: "status" };

export function filterRencana(rows: Rencana[], f: RencanaFilter, { except }: { except?: (typeof lists)[number] } = {}) {
  const has = (key: (typeof lists)[number], value: string) => key === except || !f[key].length || f[key].includes(value);
  return rows.filter((r) => r.period === f.period && has("tahun", String(r.year)) && has("pd", r.opd) && has("sasaran", r.sasaran) && has("muatan", r.muatan) && has("status", r.status));
}

export const activeFilterCount = (f: RencanaFilter, defaultPeriod: string) => lists.filter((k) => f[k].length).length + (f.period !== defaultPeriod ? 1 : 0);

/** Tahun-tahun dalam periode "2025–2029". */
export const yearsOf = (period: string) => {
  const [start, end] = period.split(/[–-]/).map(Number);
  return start && end ? Array.from({ length: end - start + 1 }, (_, i) => String(start + i)) : [];
};

export function filterFromParams(params: URLSearchParams, defaultPeriod: string, sasaranList: readonly string[]): RencanaFilter {
  const list = (key: string) => params.get(key)?.split(",").filter(Boolean) ?? [];
  return {
    period: params.get("periode") ?? defaultPeriod,
    tahun: list(param.tahun),
    pd: list(param.pd),
    sasaran: list(param.sasaran).map((i) => sasaranList[Number(i)] ?? ""),
    muatan: list(param.muatan),
    status: list(param.status),
  };
}

/** Buang nilai URL yang tidak dikenal agar tidak menjadi chip kosong. */
export function sanitizeFilter(f: RencanaFilter, valid: { periods: string[]; defaultPeriod: string; pd: Set<string>; sasaran: Set<string>; muatan: Set<string>; status: Set<string> }): RencanaFilter {
  const period = valid.periods.includes(f.period) ? f.period : valid.defaultPeriod;
  const years = new Set(yearsOf(period));
  return {
    period,
    tahun: f.tahun.filter((v) => years.has(v)),
    pd: f.pd.filter((v) => valid.pd.has(v)),
    sasaran: f.sasaran.filter((v) => valid.sasaran.has(v)),
    muatan: f.muatan.filter((v) => valid.muatan.has(v)),
    status: f.status.filter((v) => valid.status.has(v)),
  };
}

export function filterToParams(f: RencanaFilter, defaultPeriod: string, sasaranList: readonly string[]) {
  const params = new URLSearchParams();
  for (const k of lists) {
    const values = k === "sasaran" ? f.sasaran.map((s) => String(sasaranList.indexOf(s))) : f[k];
    if (values.length) params.set(param[k], values.join(","));
  }
  if (f.period !== defaultPeriod) params.set("periode", f.period);
  return params;
}
