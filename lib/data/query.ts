import type { RabIndex } from "@/lib/probis/rab-index";
import type { RabTreeNode } from "@/lib/probis/query";
import type { DataInfo } from "@/lib/types";

/** `period` selalu satu periode (single-select), default periode aktif. `pd` = wali data. */
export type DataFilter = { pd: string[]; sifat: string[]; jenis: string[]; validitas: string[]; period: string; rad1: string[]; rad2: string[]; rad3: string[] };

export const emptyFilter = (period: string): DataFilter => ({ pd: [], sifat: [], jenis: [], validitas: [], period, rad1: [], rad2: [], rad3: [] });

const listKeys = ["pd", "sifat", "jenis", "validitas", "rad1", "rad2", "rad3"] as const;
const field = { pd: "wali", sifat: "sifat", jenis: "jenis", validitas: "validitas", rad1: "rad1", rad2: "rad2", rad3: "rad3" } as const;

export function filterData(rows: DataInfo[], f: DataFilter) {
  return rows.filter((d) => d.period === f.period && listKeys.every((key) => !f[key].length || f[key].includes(d[field[key]] ?? "")));
}

export function activeFilterCount(f: DataFilter, defaultPeriod: string) {
  return listKeys.filter((key) => f[key].length).length + (f.period !== defaultPeriod ? 1 : 0);
}

export function countBy(rows: DataInfo[], key: "wali" | "sifat" | "jenis" | "validitas" | "rad1" | "rad2") {
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row[key], (counts.get(row[key]) ?? 0) + 1);
  return counts;
}

/** Rekap jumlah data berjenjang RAD L1 → L3 (hanya node yang berisi). */
export function radTree(rows: DataInfo[], rad: RabIndex): RabTreeNode[] {
  const counts = new Map<string, number>();
  for (const row of rows) for (const code of [row.rad1, row.rad2, row.rad3]) if (code) counts.set(code, (counts.get(code) ?? 0) + 1);
  const build = (parent?: string): RabTreeNode[] =>
    rad.nodes
      .filter((n) => n.parent === parent && counts.has(n.code))
      .map((n) => ({ ...n, count: counts.get(n.code)!, children: n.level < 3 ? build(n.code) : [] }))
      .sort((a, b) => b.count - a.count);
  return build(undefined);
}

/** Pilihan RAD bertingkat: L2 dibatasi L1 terpilih, L3 dibatasi L2 terpilih. */
export function radOptions(f: DataFilter, rad: RabIndex) {
  const within = (parent: string | undefined, parents: string[]) => !parents.length || parents.includes(parent!);
  const level2 = rad.level(2).filter((n) => within(n.parent, f.rad1));
  const level2Codes = new Set(level2.map((n) => n.code));
  const level3 = rad.level(3).filter((n) => level2Codes.has(n.parent!) && within(n.parent, f.rad2));
  return { level1: rad.level(1), level2, level3 };
}

/** Serialisasi filter ke/dari query string agar tampilan bisa dibagikan. */
export function filterFromParams(params: URLSearchParams, defaultPeriod: string): DataFilter {
  const list = (key: string) => params.get(key)?.split(",").filter(Boolean) ?? [];
  return { pd: list("pd"), sifat: list("sifat"), jenis: list("jenis"), validitas: list("validitas"), period: params.get("periode") ?? defaultPeriod, rad1: list("rad1"), rad2: list("rad2"), rad3: list("rad3") };
}

/** Buang nilai URL yang tidak dikenal (tautan lama/salah ketik) agar tidak menjadi chip kosong. */
export function sanitizeFilter(f: DataFilter, valid: { periods: string[]; defaultPeriod: string; pd: Set<string>; sifat: Set<string>; jenis: Set<string>; validitas: Set<string>; rad: RabIndex }): DataFilter {
  const radLevel = (level: number) => (code: string) => valid.rad.byCode.get(code)?.level === level;
  return {
    pd: f.pd.filter((v) => valid.pd.has(v)),
    sifat: f.sifat.filter((v) => valid.sifat.has(v)),
    jenis: f.jenis.filter((v) => valid.jenis.has(v)),
    validitas: f.validitas.filter((v) => valid.validitas.has(v)),
    period: valid.periods.includes(f.period) ? f.period : valid.defaultPeriod,
    rad1: f.rad1.filter(radLevel(1)),
    rad2: f.rad2.filter(radLevel(2)),
    rad3: f.rad3.filter(radLevel(3)),
  };
}

export function filterToParams(f: DataFilter, defaultPeriod: string) {
  const params = new URLSearchParams();
  for (const key of listKeys) if (f[key].length) params.set(key, f[key].join(","));
  if (f.period !== defaultPeriod) params.set("periode", f.period);
  return params;
}
