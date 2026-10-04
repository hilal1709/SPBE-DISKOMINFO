import type { Probis } from "@/lib/types";
import type { RabIndex, RabNode } from "./rab-index";

/** `period` selalu satu periode (single-select), default periode aktif. */
export type ProbisFilter = { pd: string[]; status: string[]; period: string; rab1: string[]; rab2: string[]; rab3: string[]; rab4: string[]; rab5: string[] };

/** Filter kosong pada periode default (periode aktif). */
export const emptyFilter = (period: string): ProbisFilter => ({ pd: [], status: [], period, rab1: [], rab2: [], rab3: [], rab4: [], rab5: [] });

const listKeys = ["pd", "status", "rab1", "rab2", "rab3", "rab4", "rab5"] as const;

export function filterProbis(rows: Probis[], f: ProbisFilter) {
  return rows.filter(
    (p) =>
      p.period === f.period &&
      listKeys.every((key) => !f[key].length || f[key].includes(p[key] ?? "")),
  );
}

export function activeFilterCount(f: ProbisFilter, defaultPeriod: string) {
  return listKeys.filter((key) => f[key].length).length + (f.period !== defaultPeriod ? 1 : 0);
}

export function countBy(rows: Probis[], key: keyof Probis) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const value = row[key];
    if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

export type RabTreeNode = RabNode & { count: number; children: RabTreeNode[] };

/** Rekap jumlah probis berjenjang RAB L1 → L5 (hanya node yang berisi; L4/L5 bila sudah ada referensinya). */
export function rabTree(rows: Probis[], rab: RabIndex): RabTreeNode[] {
  const counts = new Map<string, number>();
  for (const row of rows) for (const code of [row.rab1, row.rab2, row.rab3, row.rab4, row.rab5]) if (code) counts.set(code, (counts.get(code) ?? 0) + 1);
  const build = (parent?: string): RabTreeNode[] =>
    rab.nodes
      .filter((n) => n.parent === parent && counts.has(n.code))
      .map((n) => ({ ...n, count: counts.get(n.code)!, children: n.level < 5 ? build(n.code) : [] }))
      .sort((a, b) => b.count - a.count);
  return build(undefined);
}

/** Pilihan RAB bertingkat: L2 dibatasi L1 terpilih, L3 dibatasi L2 terpilih. */
export function rabOptions(f: ProbisFilter, rab: RabIndex) {
  const rabNodes = rab.nodes;
  const within = (node: RabNode, parents: string[]) => !parents.length || parents.includes(node.parent!);
  const level2 = rabNodes.filter((n) => n.level === 2 && within(n, f.rab1));
  const level2Codes = new Set(level2.map((n) => n.code));
  const level3 = rabNodes.filter((n) => n.level === 3 && level2Codes.has(n.parent!) && within(n, f.rab2));
  const level3Codes = new Set(level3.map((n) => n.code));
  const level4 = rabNodes.filter((n) => n.level === 4 && level3Codes.has(n.parent!) && within(n, f.rab3));
  const level4Codes = new Set(level4.map((n) => n.code));
  const level5 = rabNodes.filter((n) => n.level === 5 && level4Codes.has(n.parent!) && within(n, f.rab4));
  return { level1: rabNodes.filter((n) => n.level === 1), level2, level3, level4, level5 };
}


/** Serialisasi filter ke/dari query string agar tampilan bisa dibagikan. */
export function filterFromParams(params: URLSearchParams, defaultPeriod: string): ProbisFilter {
  const list = (key: string) => params.get(key)?.split(",").filter(Boolean) ?? [];
  return { pd: list("pd"), status: list("status"), period: params.get("periode") ?? defaultPeriod, rab1: list("rab1"), rab2: list("rab2"), rab3: list("rab3"), rab4: list("rab4"), rab5: list("rab5") };
}

export function filterToParams(f: ProbisFilter, defaultPeriod: string) {
  const params = new URLSearchParams();
  for (const key of listKeys) if (f[key].length) params.set(key, f[key].join(","));
  if (f.period !== defaultPeriod) params.set("periode", f.period);
  return params;
}
