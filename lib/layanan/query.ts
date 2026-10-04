import type { RabIndex } from "@/lib/probis/rab-index";
import type { RabTreeNode } from "@/lib/probis/query";
import type { Layanan } from "@/lib/types";

/** `period` selalu satu periode (single-select), default periode aktif. */
export type LayananFilter = { pd: string[]; target: string[]; metode: string[]; period: string; ral1: string[]; ral2: string[]; ral3: string[] };

export const emptyFilter = (period: string): LayananFilter => ({ pd: [], target: [], metode: [], period, ral1: [], ral2: [], ral3: [] });

const listKeys = ["pd", "target", "metode", "ral1", "ral2", "ral3"] as const;

export function filterLayanan(rows: Layanan[], f: LayananFilter) {
  return rows.filter((l) => l.period === f.period && listKeys.every((key) => !f[key].length || f[key].includes(l[key])));
}

export function activeFilterCount(f: LayananFilter, defaultPeriod: string) {
  return listKeys.filter((key) => f[key].length).length + (f.period !== defaultPeriod ? 1 : 0);
}

export function countBy(rows: Layanan[], key: "pd" | "target" | "metode" | "ral1" | "ral2" | "ral3") {
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row[key], (counts.get(row[key]) ?? 0) + 1);
  return counts;
}

/** Rekap jumlah layanan berjenjang RAL L1 → L3 (hanya node yang berisi). */
export function ralTree(rows: Layanan[], ral: RabIndex): RabTreeNode[] {
  const counts = new Map<string, number>();
  for (const row of rows) for (const code of [row.ral1, row.ral2, row.ral3]) counts.set(code, (counts.get(code) ?? 0) + 1);
  const build = (parent?: string): RabTreeNode[] =>
    ral.nodes
      .filter((n) => n.parent === parent && counts.has(n.code))
      .map((n) => ({ ...n, count: counts.get(n.code)!, children: n.level < 3 ? build(n.code) : [] }))
      .sort((a, b) => b.count - a.count);
  return build(undefined);
}

/** Pilihan RAL bertingkat: L2 dibatasi L1 terpilih, L3 dibatasi L2 terpilih. */
export function ralOptions(f: LayananFilter, ral: RabIndex) {
  const within = (parent: string | undefined, parents: string[]) => !parents.length || parents.includes(parent!);
  const level2 = ral.level(2).filter((n) => within(n.parent, f.ral1));
  const level2Codes = new Set(level2.map((n) => n.code));
  const level3 = ral.level(3).filter((n) => level2Codes.has(n.parent!) && within(n.parent, f.ral2));
  return { level1: ral.level(1), level2, level3 };
}

/** Serialisasi filter ke/dari query string agar tampilan bisa dibagikan. */
export function filterFromParams(params: URLSearchParams, defaultPeriod: string): LayananFilter {
  const list = (key: string) => params.get(key)?.split(",").filter(Boolean) ?? [];
  return { pd: list("pd"), target: list("target"), metode: list("metode"), period: params.get("periode") ?? defaultPeriod, ral1: list("ral1"), ral2: list("ral2"), ral3: list("ral3") };
}

/** Buang nilai URL yang tidak dikenal (tautan lama/salah ketik) agar tidak menjadi chip kosong. */
export function sanitizeFilter(f: LayananFilter, valid: { periods: string[]; defaultPeriod: string; pd: Set<string>; target: Set<string>; metode: Set<string>; ral: RabIndex }): LayananFilter {
  const ralLevel = (level: number) => (code: string) => valid.ral.byCode.get(code)?.level === level;
  return {
    pd: f.pd.filter((v) => valid.pd.has(v)),
    target: f.target.filter((v) => valid.target.has(v)),
    metode: f.metode.filter((v) => valid.metode.has(v)),
    period: valid.periods.includes(f.period) ? f.period : valid.defaultPeriod,
    ral1: f.ral1.filter(ralLevel(1)),
    ral2: f.ral2.filter(ralLevel(2)),
    ral3: f.ral3.filter(ralLevel(3)),
  };
}

export function filterToParams(f: LayananFilter, defaultPeriod: string) {
  const params = new URLSearchParams();
  for (const key of listKeys) if (f[key].length) params.set(key, f[key].join(","));
  if (f.period !== defaultPeriod) params.set("periode", f.period);
  return params;
}
