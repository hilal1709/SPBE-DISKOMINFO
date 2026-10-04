/**
 * Indeks referensi RAB untuk satu versi (mis. "Perpres 132/2022").
 * Data datang dari database (tabel rab_references); modul ini murni sehingga dipakai di server maupun klien.
 */

export type RabLevel = 1 | 2 | 3 | 4 | 5;
export type RabStatus = "berlaku" | "tidak_berlaku";
export type RabNode = { id?: string; code: string; name: string; level: RabLevel; parent?: string; status?: RabStatus };

export type RabIndex = {
  nodes: RabNode[];
  byCode: Map<string, RabNode>;
  /** Anak langsung sebuah kode. `onlyActive` menyembunyikan yang tidak berlaku (untuk isian baru). */
  children: (code: string | null | undefined, onlyActive?: boolean) => RabNode[];
  level: (level: RabLevel, onlyActive?: boolean) => RabNode[];
  /** L1 dan L2 diturunkan dari L3. */
  chain: (rab3: string | null | undefined) => { l1?: RabNode; l2?: RabNode; l3?: RabNode };
  /** "kode nama" untuk kode terdaftar, selain itu teks apa adanya (isian L4/L5 bebas). */
  text: (value: string | null | undefined) => string | null;
  label: (code: string) => string;
  /** Referensi L4/L5 sudah tersedia di versi ini. */
  hasDeep: boolean;
  active: (node: RabNode | undefined) => boolean;
};

export function makeRabIndex(nodes: RabNode[]): RabIndex {
  const byCode = new Map(nodes.map((n) => [n.code, n]));
  const childMap = new Map<string, RabNode[]>();
  for (const node of nodes) if (node.parent) childMap.set(node.parent, [...(childMap.get(node.parent) ?? []), node]);
  const active = (node: RabNode | undefined) => !!node && node.status !== "tidak_berlaku";
  const sorted = (list: RabNode[]) => [...list].sort((a, b) => a.code.localeCompare(b.code, "id", { numeric: true }));

  return {
    nodes,
    byCode,
    children: (code, onlyActive) => (code ? sorted((childMap.get(code) ?? []).filter((n) => !onlyActive || active(n))) : []),
    level: (level, onlyActive) => sorted(nodes.filter((n) => n.level === level && (!onlyActive || active(n)))),
    chain: (rab3) => {
      const l3 = rab3 ? byCode.get(rab3) : undefined;
      const l2 = l3?.parent ? byCode.get(l3.parent) : undefined;
      const l1 = l2?.parent ? byCode.get(l2.parent) : undefined;
      return { l1, l2, l3 };
    },
    text: (value) => {
      if (!value) return null;
      const node = byCode.get(value);
      return node ? `${node.code} ${node.name}` : value;
    },
    label: (code) => `${code} ${byCode.get(code)?.name ?? ""}`.trim(),
    hasDeep: nodes.some((n) => n.level >= 4),
    active,
  };
}

/** Kumpulan versi RAB yang dipakai periode-periode arsitektur. */
export type RabSet = {
  versions: { id: string; name: string; nodes: RabNode[] }[];
  /** nama periode → id versi RAB. */
  periodVersion: Record<string, string>;
  /** Versi untuk isian baru (versi periode aktif). */
  activeVersion: string;
};
