import { domainKeys, type DomainKey } from "@/lib/domains";

export type DomainNode = { id: string; domain: DomainKey; code: string; name: string; opd: string; opdName: string; period: string; category: string };
export type DomainEdge = { id: string; source: string; target: string; label: string; storage: "junction" | "jsonb" | "text"; origin: string };
export type DomainSummary = { domain: DomainKey; opd: string; opdName: string; period: string; category: string; count: number; sample: boolean };
export type Architecture = { nodes: DomainNode[]; edges: DomainEdge[]; summary: DomainSummary[]; securityVisible: boolean; partial: boolean; available: boolean };
export type Impact = { node: DomainNode; depth: number; certain: boolean; reason: string };
export type RelationSummary = { source: DomainKey; target: DomainKey; sourceOpd: string; targetOpd: string; period: string; count: number };

/**
 * Definisi relasi (sama di Ringkasan dan Integrasi): pasangan record unik antardomain yang keduanya tervalidasi pada
 * periode yang sama, dari tautan tersimpan maupun rujukan kode/nama. Tautan ganda (tersimpan + rujukan) dihitung sekali;
 * pasangan dalam satu domain (mis. infrastruktur ↔ infrastruktur) tidak dihitung.
 */
export const RELATION_DEFINITION = "Relasi = pasangan record unik antardomain (tautan tersimpan atau rujukan kode/nama), keduanya tervalidasi pada periode yang sama.";

/** Pasangan relasi unik antardomain sesuai RELATION_DEFINITION. */
export function relationPairs(nodes: DomainNode[], edges: DomainEdge[]) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const pairs = new Map<string, [DomainNode, DomainNode]>();
  for (const e of edges) {
    const a = byId.get(e.source), b = byId.get(e.target);
    if (!a || !b || a.domain === b.domain) continue;
    const key = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
    if (!pairs.has(key)) pairs.set(key, [a, b]);
  }
  return [...pairs.values()];
}

export function summarizeRelations(nodes: DomainNode[], edges: DomainEdge[]): RelationSummary[] {
  const groups = new Map<string, RelationSummary>();
  for (const [source, target] of relationPairs(nodes, edges)) {
    const key = JSON.stringify([source.domain, target.domain, source.opd, target.opd, source.period]);
    const row = groups.get(key) ?? { source: source.domain, target: target.domain, sourceOpd: source.opd, targetOpd: target.opd, period: source.period, count: 0 };
    row.count++; groups.set(key, row);
  }
  return [...groups.values()];
}

/** Traverse indexes once; cycles do not revisit or multiply records. Never mutates the snapshot. */
export function analyzeImpact(nodes: DomainNode[], edges: DomainEdge[], selected: string, mode: "change" | "delete", indirect = true): Impact[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  if (!byId.has(selected)) return [];
  const adjacent = new Map<string, { id: string; edge: DomainEdge }[]>();
  for (const edge of edges) {
    if (!byId.has(edge.source) || !byId.has(edge.target)) continue;
    for (const [from, to] of [[edge.source, edge.target], [edge.target, edge.source]]) {
      const list = adjacent.get(from) ?? []; list.push({ id: to, edge }); adjacent.set(from, list);
    }
  }
  const queue = [{ id: selected, depth: 0 }];
  const seen = new Set([selected]);
  const impacts: Impact[] = [];
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i];
    if (!indirect && current.depth >= 1) continue;
    for (const next of adjacent.get(current.id) ?? []) {
      if (seen.has(next.id)) {
        if (current.depth === 0 && mode === "delete" && next.edge.storage === "junction") {
          const existing = impacts.find((i) => i.node.id === next.id);
          if (existing) { existing.certain = true; existing.reason = "Tautan junction pasti terlepas oleh ON DELETE CASCADE; record terkait tidak ikut dihapus."; }
        }
        continue;
      }
      seen.add(next.id);
      const depth = current.depth + 1;
      // CASCADE applies to the junction row, never to the neighboring business record.
      const certain = mode === "delete" && depth === 1 && next.edge.storage === "junction";
      impacts.push({ node: byId.get(next.id)!, depth, certain, reason: certain
        ? "Tautan junction pasti terlepas oleh ON DELETE CASCADE; record terkait tidak ikut dihapus."
        : depth > 1 ? "Potensi dampak tidak langsung; perlu penilaian pemilik data, tidak ada penghapusan otomatis."
        : mode === "change" ? next.edge.storage === "junction"
          ? "Potensi perubahan makna atau penggunaan; foreign key UUID tetap saat kode/nama berubah."
          : "Perubahan kode atau nama berpotensi membuat referensi teks tidak cocok; tidak ada pembaruan otomatis oleh FK."
        : "Referensi kode/nama tidak mempunyai FK; berpotensi menjadi referensi usang." });
      queue.push({ id: next.id, depth });
    }
  }
  return impacts;
}

export function filterSummary(summary: DomainSummary[], period: string, opds: string[]) {
  return summary.filter((r) => (!period || r.period === period) && (!opds.length || opds.includes(r.opd)));
}
export function domainTotals(summary: DomainSummary[]) {
  return Object.fromEntries(domainKeys.map((domain) => [domain, summary.filter((r) => r.domain === domain).reduce((n, r) => n + r.count, 0)])) as Record<DomainKey, number>;
}

/**
 * Bentuk ringkas Architecture untuk dikirim ke browser (B7): string berulang (OPD, periode, label, domain) dijadikan
 * indeks tabel, ID UUID diganti `${domain}:${kode}` (unik per periode), dan ID/origin edge diturunkan ulang di klien.
 */
export type PackedArchitecture = {
  /** [domain, kode, nama, indeks OPD, indeks periode, kategori] */
  nodes: [number, string, string, number, number, string][];
  /** [indeks node sumber, indeks node tujuan, indeks label, indeks bentuk referensi] */
  edges: [number, number, number, number][];
  domains: DomainKey[];
  opds: [string, string][];
  periods: string[];
  labels: string[];
  summary: DomainSummary[];
  securityVisible: boolean;
  partial: boolean;
  available: boolean;
};

const storages: DomainEdge["storage"][] = ["junction", "jsonb", "text"];

export function packArchitecture(a: Architecture): PackedArchitecture {
  const table = <T,>(key: (v: T) => string) => {
    const index = new Map<string, number>();
    const list: T[] = [];
    return { list, of: (v: T) => { const k = key(v); let i = index.get(k); if (i === undefined) { i = list.length; index.set(k, i); list.push(v); } return i; } };
  };
  const domainT = table<DomainKey>((d) => d), opdT = table<[string, string]>(([c]) => c), periodT = table<string>((p) => p), labelT = table<string>((l) => l);
  const position = new Map(a.nodes.map((n, i) => [n.id, i]));
  return {
    nodes: a.nodes.map((n) => [domainT.of(n.domain), n.code, n.name, opdT.of([n.opd, n.opdName]), periodT.of(n.period), n.category]),
    edges: a.edges.flatMap((e) => {
      const s = position.get(e.source), t = position.get(e.target);
      return s === undefined || t === undefined ? [] : [[s, t, labelT.of(e.label), storages.indexOf(e.storage)] as [number, number, number, number]];
    }),
    domains: domainT.list, opds: opdT.list, periods: periodT.list, labels: labelT.list,
    summary: a.summary, securityVisible: a.securityVisible, partial: a.partial, available: a.available,
  };
}

export function unpackArchitecture(p: PackedArchitecture): Architecture {
  const nodes: DomainNode[] = p.nodes.map(([d, code, name, o, period, category]) => {
    const domain = p.domains[d]!;
    const [opd, opdName] = p.opds[o]!;
    return { id: `${domain}:${code}`, domain, code, name, opd, opdName, period: p.periods[period]!, category };
  });
  const edges: DomainEdge[] = p.edges.map(([s, t, l, k], i) => ({ id: String(i), source: nodes[s]!.id, target: nodes[t]!.id, label: p.labels[l]!, storage: storages[k]!, origin: "" }));
  return { nodes, edges, summary: p.summary, securityVisible: p.securityVisible, partial: p.partial, available: p.available };
}
