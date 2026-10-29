"use client";

import { useId } from "react";
import { domainKeys, domains } from "@/lib/domains";
import type { DomainNode, DomainEdge } from "@/lib/integrasi/model";
import { cn } from "@/lib/utils";

/** Detail bounded to direct neighbors; the tables retain the complete result. */
export function RecordMap({ selected, nodes, edges, onSelect }: {
  selected: DomainNode; nodes: DomainNode[]; edges: DomainEdge[];
  onSelect: (node: DomainNode) => void;
}) {
  const marker = useId().replaceAll(":", "");
  const related = new Set(edges.flatMap((e) => [e.source, e.target]));
  const columns = domainKeys.filter((d) => nodes.some((n) => n.domain === d && related.has(n.id)) || selected.domain === d);
  const displayed = columns.flatMap((d) => nodes.filter((n) => n.domain === d && (related.has(n.id) || n.id === selected.id)).sort((a, b) => Number(b.id === selected.id) - Number(a.id === selected.id)).slice(0, 6));
  const width = Math.max(400, columns.length * 230);
  const height = Math.max(210, ...columns.map((d) => displayed.filter((n) => n.domain === d).length * 100 + 60));
  const points = new Map(displayed.map((n) => [n.id, { x: columns.indexOf(n.domain) * 230 + 15, y: 55 + displayed.filter((p) => p.domain === n.domain).indexOf(n) * 100 }]));
  const connections = new Map<string, { edge: DomainEdge; labels: Set<string>; reverse: boolean; solid: boolean }>();
  for (const edge of edges) {
    const key = JSON.stringify([[edge.source, edge.target].sort(), edge.storage === "junction" ? "solid" : "reference"]);
    const existing = connections.get(key);
    if (existing) {
      existing.labels.add(edge.label);
      if (edge.source !== existing.edge.source) existing.reverse = true;
    } else connections.set(key, { edge, labels: new Set([edge.label]), reverse: false, solid: edge.storage === "junction" });
  }
  const visibleEdges = [...connections.values()].filter(({ edge }) => points.has(edge.source) && points.has(edge.target));
  return <div className="grid gap-3">
    <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-2"><span aria-hidden="true" className="w-8 border-t-2 border-brand-teal" />Utuh: tautan langsung antarrecord</span>
      <span className="inline-flex items-center gap-2"><span aria-hidden="true" className="w-8 border-t-2 border-dashed border-destructive" />Putus-putus: kecocokan kode/nama, misalnya cloud atau server</span>
    </div>
    <p className="text-xs text-muted-foreground">Panah mengarah dari record sumber ke record yang dirujuk. Klik record lain untuk mengganti pilihan.</p>
    <div className="overflow-x-auto rounded-xl border bg-muted/30" tabIndex={0} role="region" aria-label="Visualisasi hubungan langsung, geser untuk melihat seluruh domain">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ minWidth: width }} role="group" aria-label={`Hubungan langsung ${selected.name}`}>
        <defs>{["solid", "dashed"].map((style) => <marker key={style} id={`${marker}-${style}`} viewBox="0 0 10 10" refX={9} refY={5} markerWidth={7} markerHeight={7} orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill={style === "solid" ? "var(--brand-teal)" : "var(--destructive)"} /></marker>)}</defs>
        {columns.map((d, i) => <text key={d} x={i * 230 + 15} y={27} className="fill-foreground text-xs font-semibold">{domains[d].label}</text>)}
        {visibleEdges.map(({ edge: e, labels, reverse, solid }, index) => {
          const a = points.get(e.source)!, b = points.get(e.target)!;
          const forward = a.x < b.x;
          const sameColumn = a.x === b.x;
          const pair = [e.source, e.target].sort();
          const parallel = connections.has(JSON.stringify([pair, solid ? "reference" : "solid"]));
          const offset = parallel ? (solid ? -13 : 13) : 0;
          const sx = a.x + (sameColumn || forward ? 190 : 0), tx = b.x + (sameColumn || !forward ? 190 : 0);
          const sy = a.y + 34 + offset, ty = b.y + 34 + offset;
          const bend = sameColumn ? sx + 35 + offset + index % 3 * 6 : (sx + tx) / 2;
          const arrow = `url(#${marker}-${solid ? "solid" : "dashed"})`;
          return <path key={e.id} d={`M ${sx} ${sy} C ${bend} ${sy}, ${bend} ${ty}, ${tx} ${ty}`} fill="none" stroke={solid ? "var(--brand-teal)" : "var(--destructive)"} strokeWidth={2} strokeDasharray={solid ? undefined : "6 4"} markerStart={reverse ? arrow : undefined} markerEnd={arrow}><title>{[...labels].join("; ")}</title></path>;
        })}
        {displayed.map((n) => { const p = points.get(n.id)!; return <foreignObject key={n.id} x={p.x} y={p.y} width={190} height={78}>
          <button type="button" onClick={() => onSelect(n)} aria-pressed={n.id === selected.id} title={`${n.code}: ${n.name}`} className={cn("flex h-[72px] w-full flex-col justify-center rounded-xl border bg-card px-3 text-left shadow-sm hover:bg-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring", n.id === selected.id && "border-primary bg-accent")}>
            <span className="w-full truncate text-[10px] text-muted-foreground">{n.code}{n.id === selected.id ? " · Dipilih" : ""}</span><span className="line-clamp-2 text-xs font-semibold">{n.name}</span>
          </button>
        </foreignObject>; })}
      </svg>
    </div>
    {!edges.length && <p className="text-sm text-muted-foreground">Data ini belum memiliki hubungan langsung dalam cakupan filter.</p>}
    <p className="text-xs text-muted-foreground">Jika dua record memiliki tautan langsung sekaligus referensi kode/nama, kedua jenis garis ditampilkan pada jalur terpisah. Panah dua arah menandakan hubungan timbal balik. {visibleEdges.length < connections.size ? `Cuplikan ${visibleEdges.length} dari ${connections.size} hubungan, maksimal 6 record per domain. ` : ""}Rincian seluruh relasi ada pada daftar di bawah.</p>
  </div>;
}
