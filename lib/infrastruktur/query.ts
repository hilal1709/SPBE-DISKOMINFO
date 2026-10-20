import type { RabIndex } from "@/lib/probis/rab-index";
import type { Infrastruktur } from "@/lib/types";

/** `period` selalu satu periode (single-select), default periode aktif. `pd` = instansi pemilik. */
export type InfraFilter = { pd: string[]; jenis: string[]; kepemilikan: string[]; period: string; rai1: string[]; rai2: string[] };

export const emptyFilter = (period: string): InfraFilter => ({ pd: [], jenis: [], kepemilikan: [], period, rai1: [], rai2: [] });

const listKeys = ["pd", "jenis", "kepemilikan", "rai1", "rai2"] as const;
const field = { pd: "opd", jenis: "jenis", kepemilikan: "kepemilikan", rai1: "rai1", rai2: "rai2" } as const;

export function filterInfra(rows: Infrastruktur[], f: InfraFilter) {
  return rows.filter((r) => r.period === f.period && listKeys.every((key) => !f[key].length || f[key].includes(r[field[key]] ?? "")));
}

export function activeFilterCount(f: InfraFilter, defaultPeriod: string) {
  return listKeys.filter((key) => f[key].length).length + (f.period !== defaultPeriod ? 1 : 0);
}

export function countBy<K extends "opd" | "jenis" | "kepemilikan" | "rai2">(rows: Infrastruktur[], key: K) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const value = row[key];
    if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

/** Pilihan RAI bertingkat: L2 dibatasi L1 terpilih. */
export function raiOptions(f: InfraFilter, rai: RabIndex) {
  return { level1: rai.level(1), level2: rai.level(2).filter((n) => !f.rai1.length || f.rai1.includes(n.parent!)) };
}

/** Serialisasi filter ke/dari query string agar tampilan bisa dibagikan. */
export function filterFromParams(params: URLSearchParams, defaultPeriod: string): InfraFilter {
  const list = (key: string) => params.get(key)?.split(",").filter(Boolean) ?? [];
  return { pd: list("pd"), jenis: list("komponen"), kepemilikan: list("kepemilikan"), period: params.get("periode") ?? defaultPeriod, rai1: list("rai1"), rai2: list("rai2") };
}

/** Buang nilai URL yang tidak dikenal (tautan lama/salah ketik) agar tidak menjadi chip kosong. */
export function sanitizeFilter(
  f: InfraFilter,
  valid: { periods: string[]; defaultPeriod: string; pd: Set<string>; jenis: Set<string>; kepemilikan: Set<string>; rai: RabIndex },
): InfraFilter {
  const raiLevel = (level: number) => (code: string) => valid.rai.byCode.get(code)?.level === level;
  const rai1 = f.rai1.filter(raiLevel(1));
  return {
    pd: f.pd.filter((v) => valid.pd.has(v)),
    jenis: f.jenis.filter((v) => valid.jenis.has(v)),
    kepemilikan: f.kepemilikan.filter((v) => valid.kepemilikan.has(v)),
    period: valid.periods.includes(f.period) ? f.period : valid.defaultPeriod,
    rai1,
    rai2: f.rai2.filter((code) => raiLevel(2)(code) && (!rai1.length || rai1.includes(valid.rai.byCode.get(code)!.parent!))),
  };
}

export function filterToParams(f: InfraFilter, defaultPeriod: string) {
  const params = new URLSearchParams();
  const name = { pd: "pd", jenis: "komponen", kepemilikan: "kepemilikan", rai1: "rai1", rai2: "rai2" } as const;
  for (const key of listKeys) if (f[key].length) params.set(name[key], f[key].join(","));
  if (f.period !== defaultPeriod) params.set("periode", f.period);
  return params;
}
