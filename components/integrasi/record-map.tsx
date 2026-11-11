"use client";

import { useEffect, useId, useMemo, useRef } from "react";
import { loadAnime, motionOk } from "@/components/motion/anime-lazy";
import { domainKeys, domains } from "@/lib/domains";
import type { DomainNode, DomainEdge } from "@/lib/integrasi/model";
import { cn } from "@/lib/utils";

/** Detail bounded to direct neighbors; the tables retain the complete result. */
export function RecordMap({ selected, nodes, edges, onSelect }: {
  selected: DomainNode; nodes: DomainNode[]; edges: DomainEdge[];
  onSelect: (node: DomainNode) => void;
}) {
  const marker = useId().replaceAll(":", "");
  const { columns, displayed, width, height, points, connections, visibleEdges } = useMemo(() => recordLayout(selected, nodes, edges), [selected, nodes, edges]);

  // anime.js: garis dan kartu record muncul bertahap setiap pilihan berganti (opacity, aman untuk garis putus-putus).
  const svgRef = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const el = svgRef.current;
    if (!el || !motionOk()) return;
    let undo: (() => void) | undefined;
    let active = true;
    loadAnime().then(({ createTimeline, stagger }) => {
      if (!active) return;
      const cards = el.querySelectorAll("[data-record]"), lines = el.querySelectorAll("[data-edge]");
      const timeline = createTimeline();
      if (cards.length) timeline.add(cards, { opacity: [0, 1], duration: 350, delay: stagger(35), ease: "out(3)" }, 0);
      if (lines.length) timeline.add(lines, { opacity: [0, 1], duration: 400, delay: stagger(40) }, 150);
      undo = () => void timeline.revert();
    });
    return () => { active = false; undo?.(); };
  }, [selected.id]);

  return <div className="grid gap-3">
    <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
      {kinds.map((k) => <span key={k} className="inline-flex items-center gap-2"><svg aria-hidden="true" width="34" height="8"><line x1="0" y1="4" x2="26" y2="4" stroke={kindStyle[k].color} strokeWidth={2} strokeDasharray={kindStyle[k].dash} /><path d="M 26 0 L 34 4 L 26 8 z" fill={kindStyle[k].color} /></svg>{kindStyle[k].legend}</span>)}
    </div>
    <p className="text-xs text-muted-foreground">Data masuk mengarah ke aplikasi, data keluar mengarah dari aplikasi; tautan lain mengarah dari record sumber ke record yang dirujuk. Klik record lain untuk mengganti pilihan.</p>
    <div className="overflow-x-auto rounded-xl border bg-muted/30" tabIndex={0} role="region" aria-label="Visualisasi hubungan langsung, geser untuk melihat seluruh domain">
      <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ minWidth: width }} role="group" aria-label={`Hubungan langsung ${selected.name}`}>
        <defs>{kinds.map((k) => <marker key={k} id={`${marker}-${k}`} viewBox="0 0 10 10" refX={9} refY={5} markerWidth={7} markerHeight={7} orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill={kindStyle[k].color} /></marker>)}</defs>
        {columns.map((d, i) => <text key={d} x={i * 230 + 15} y={27} className="fill-foreground text-xs font-semibold">{domains[d].label}</text>)}
        {visibleEdges.map(({ from, to, kind, labels, reverse, offset }, index) => {
          const a = points.get(from)!, b = points.get(to)!;
          const forward = a.x < b.x;
          const sameColumn = a.x === b.x;
          const sx = a.x + (sameColumn || forward ? 190 : 0), tx = b.x + (sameColumn || !forward ? 190 : 0);
          const sy = a.y + 34 + offset, ty = b.y + 34 + offset;
          const bend = sameColumn ? sx + 35 + offset + index % 3 * 6 : (sx + tx) / 2;
          const arrow = `url(#${marker}-${kind})`;
          return <path data-edge key={`${from}|${to}|${kind}`} d={`M ${sx} ${sy} C ${bend} ${sy}, ${bend} ${ty}, ${tx} ${ty}`} fill="none" stroke={kindStyle[kind].color} strokeWidth={2} strokeDasharray={kindStyle[kind].dash} markerStart={reverse ? arrow : undefined} markerEnd={arrow}><title>{[...labels].join("; ")}</title></path>;
        })}
        {displayed.map((n) => { const p = points.get(n.id)!; return <foreignObject data-record key={n.id} x={p.x} y={p.y} width={190} height={78}>
          <button type="button" onClick={() => onSelect(n)} aria-pressed={n.id === selected.id} title={`${n.code}: ${n.name}`} className={cn("flex h-[72px] w-full flex-col justify-center rounded-xl border bg-card px-3 text-left shadow-sm hover:bg-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring", n.id === selected.id && "border-primary bg-accent")}>
            <span className="w-full truncate text-[10px] text-muted-foreground">{n.code}{n.id === selected.id ? " · Dipilih" : ""}</span><span className="line-clamp-2 text-xs font-semibold">{n.name}</span>
          </button>
        </foreignObject>; })}
      </svg>
    </div>
    {!edges.length && <p className="text-sm text-muted-foreground">Data ini belum memiliki hubungan langsung dalam cakupan filter.</p>}
    <p className="text-xs text-muted-foreground">Jenis hubungan berbeda antara dua record digambar pada jalur terpisah. Panah dua arah menandakan hubungan timbal balik. {visibleEdges.length < connections.size ? `Cuplikan ${visibleEdges.length} dari ${connections.size} hubungan, maksimal 6 record per domain. ` : ""}Rincian seluruh relasi ada pada daftar di bawah.</p>
  </div>;
}

type Kind = "in" | "out" | "solid" | "reference";
const kinds: Kind[] = ["in", "out", "solid", "reference"];
const kindStyle: Record<Kind, { color: string; dash?: string; legend: string }> = {
  in: { color: "var(--brand-teal)", legend: "Data masuk ke aplikasi" },
  out: { color: "var(--brand-orange)", legend: "Data keluar dari aplikasi" },
  solid: { color: "var(--muted-foreground)", legend: "Tautan langsung antarrecord" },
  reference: { color: "var(--destructive)", dash: "6 4", legend: "Kecocokan kode/nama, misalnya cloud atau server" },
};

/** Arah gambar: "Input data" dibalik agar panah menuju aplikasi; model dan analisis dampak tidak berubah. */
function drawn(edge: DomainEdge): { from: string; to: string; kind: Kind } {
  if (edge.label === "Input data") return { from: edge.target, to: edge.source, kind: "in" };
  if (edge.label === "Output data") return { from: edge.source, to: edge.target, kind: "out" };
  return { from: edge.source, to: edge.target, kind: edge.storage === "junction" ? "solid" : "reference" };
}

/** Tata letak cuplikan: maks. 6 record per domain, posisi baris dihitung dengan penghitung per kolom (bukan indexOf berulang). */
function recordLayout(selected: DomainNode, nodes: DomainNode[], edges: DomainEdge[]) {
  const related = new Set(edges.flatMap((e) => [e.source, e.target]));
  const shown = (n: DomainNode) => related.has(n.id) || n.id === selected.id;
  const byDomain = new Map<string, DomainNode[]>();
  for (const n of nodes) if (shown(n)) byDomain.set(n.domain, [...(byDomain.get(n.domain) ?? []), n]);
  const columns = domainKeys.filter((d) => byDomain.has(d) || selected.domain === d);
  const groups = columns.map((d) => (byDomain.get(d) ?? []).sort((a, b) => Number(b.id === selected.id) - Number(a.id === selected.id)).slice(0, 6));
  const displayed = groups.flat();
  const width = Math.max(400, columns.length * 230);
  const height = Math.max(210, ...groups.map((g) => g.length * 100 + 60));
  const points = new Map(groups.flatMap((g, ci) => g.map((n, ri) => [n.id, { x: ci * 230 + 15, y: 55 + ri * 100 }] as const)));
  type Connection = { from: string; to: string; kind: Kind; labels: Set<string>; reverse: boolean; offset: number };
  const connections = new Map<string, Connection>();
  for (const edge of edges) {
    const d = drawn(edge);
    const key = JSON.stringify([[d.from, d.to].sort(), d.kind]);
    const existing = connections.get(key);
    if (existing) {
      existing.labels.add(edge.label);
      if (d.from !== existing.from) existing.reverse = true;
    } else connections.set(key, { ...d, labels: new Set([edge.label]), reverse: false, offset: 0 });
  }
  // Beberapa jenis hubungan pada pasangan yang sama digambar sejajar (selang 13 px).
  const byPair = new Map<string, Connection[]>();
  for (const c of connections.values()) { const k = [c.from, c.to].sort().join("|"); byPair.set(k, [...(byPair.get(k) ?? []), c]); }
  for (const list of byPair.values()) list.forEach((c, i) => { c.offset = (i - (list.length - 1) / 2) * 13; });
  const visibleEdges = [...connections.values()].filter((c) => points.has(c.from) && points.has(c.to));
  return { columns, displayed, width, height, points, connections, visibleEdges };
}
