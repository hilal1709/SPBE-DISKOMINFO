import { domainKeys, type DomainKey } from "@/lib/domains";

export type DomainNode = { id: string; domain: DomainKey; code: string; name: string; opd: string; opdName: string; period: string; category: string };
export type DomainEdge = { id: string; source: string; target: string; label: string; storage: "junction" | "jsonb" | "text"; origin: string };
export type DomainSummary = { domain: DomainKey; opd: string; opdName: string; period: string; category: string; count: number; sample: boolean };
export type Architecture = { nodes: DomainNode[]; edges: DomainEdge[]; summary: DomainSummary[]; securityVisible: boolean; partial: boolean; available: boolean };
export type Impact = { node: DomainNode; depth: number; certain: boolean; reason: string };
export type RelationSummary = { source: DomainKey; target: DomainKey; sourceOpd: string; targetOpd: string; period: string; count: number };

export function summarizeRelations(nodes: DomainNode[], edges: DomainEdge[]): RelationSummary[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const groups = new Map<string, RelationSummary>();
  for (const e of edges) {
    const source = byId.get(e.source), target = byId.get(e.target);
    if (!source || !target) continue;
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
