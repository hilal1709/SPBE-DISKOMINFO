"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { loadAnime, motionOk } from "@/components/motion/anime-lazy";
import { DoughnutChart } from "@/components/charts";
import { Segmented } from "@/components/blocks/segmented";
import { formatNumber } from "@/lib/format";
import { domainKeys, domains, type DomainKey } from "@/lib/domains";
import type { RelationSummary } from "@/lib/integrasi/model";

const colors = ["--brand-teal", "--brand-orange", "--brand-yellow", "--brand-amber", "--brand-sky", "--brand-charcoal"];
const color = (domain: DomainKey) => `var(${colors[domainKeys.indexOf(domain)]})`;
const percentage = (value: number, total: number) => `${(total ? value / total * 100 : 0).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`;

export function OpdLeaderboard({ rows, onSelect }: { rows: { value: string; label: string; count: number }[]; onSelect: (opd: string) => void }) {
  const [limit, setLimit] = useState<"5" | "10" | "all">("5");
  const shown = limit === "all" ? rows : rows.slice(0, Number(limit));
  const total = rows.reduce((n, row) => n + row.count, 0);
  return <div className="grid gap-4">
    <Segmented label="Jumlah Perangkat Daerah" value={limit} onChange={setLimit} options={[{ value: "5", label: "Top 5" }, { value: "10", label: "Top 10" }, { value: "all", label: "Semua" }]} />
    <ol className="grid max-h-80 gap-1 overflow-y-auto pr-1">{shown.map((row, i) => <li key={row.value}><button type="button" onClick={() => onSelect(row.value)} className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring" title={`${row.label}: ${formatNumber(row.count)} record · ${percentage(row.count, total)} dari inventaris dalam filter`}>
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold tabular-nums">{i + 1}</span>
      <span className="grid min-w-0 flex-1 gap-2"><span className="flex items-center justify-between gap-3 text-xs"><span className="truncate">{row.label}</span><b className="tabular-nums">{formatNumber(row.count)}</b></span><span className="h-2 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-brand-teal" style={{ width: `${rows[0]?.count ? row.count / rows[0].count * 100 : 0}%` }} /></span></span>
    </button></li>)}</ol>
    {!shown.length && <p className="text-sm text-muted-foreground">Belum ada inventaris pada filter ini.</p>}
    <p className="text-xs text-muted-foreground">{shown.length} dari {rows.length} OPD · Klik peringkat untuk melihat rincian.</p>
  </div>;
}

export function MiniComposition({ labels, values, onSelect }: { labels: string[]; values: number[]; onSelect: (index: number) => void }) {
  const total = values.reduce((n, count) => n + count, 0);
  return <div className="grid gap-3">
    <div className="mx-auto h-36 w-full max-w-64"><DoughnutChart labels={labels} data={values} legend={false} percentages semicircle caption="Record" onSelect={onSelect} colors={colors} /></div>
    <div className="grid gap-1">{labels.map((label, i) => <button type="button" key={label} onClick={() => onSelect(i)} title={`${label}: ${formatNumber(values[i])} record (${percentage(values[i], total)})`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"><span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: `var(${colors[i % colors.length]})` }} /><span className="min-w-0 flex-1">{label}</span><span className="text-muted-foreground tabular-nums">{formatNumber(values[i])}</span><b className="w-12 text-right tabular-nums">{percentage(values[i], total)}</b></button>)}</div>
  </div>;
}

/** Two columns distinguish endpoints, not extra hops. Ribbon thickness uses one shared count scale. */
export function DomainSankey({ relations, href }: { relations: RelationSummary[]; href: (source: DomainKey) => string }) {
  const layout = useMemo(() => sankeyLayout(relations), [relations]);
  const svgRef = useRef<SVGSVGElement>(null);
  const clipId = useId();
  useFlowReveal(svgRef, layout?.total);
  if (!layout) return <p className="text-sm text-muted-foreground">Belum ada hubungan langsung pada filter ini.</p>;
  const { total, left, right, ribbons } = layout;
  return <div className="grid gap-3">
    <div className="overflow-x-auto"><svg ref={svgRef} viewBox="0 0 800 365" className="min-w-160 w-full" role="group" aria-label="Sankey hubungan langsung antardomain. Ketebalan aliran mewakili jumlah tautan.">
      <defs><clipPath id={clipId}><rect data-flow width="800" height="365" /></clipPath></defs>
      <text x="178" y="16" textAnchor="end" className="fill-muted-foreground text-[11px]">Domain asal</text><text x="622" y="16" className="fill-muted-foreground text-[11px]">Domain terkait</text>
      <g clipPath={`url(#${clipId})`}>{ribbons.map((r) => <a href={href(r.source)} key={`${r.source}:${r.target}`} aria-label={`${domains[r.source].label} ke ${domains[r.target].label}: ${formatNumber(r.count)} relasi. Buka pencarian ${domains[r.source].label}.`} className="group outline-none"><path d={r.path} fill={color(r.source)} fillOpacity="0.65" className="opacity-60 transition-opacity group-hover:opacity-100 group-focus:stroke-foreground group-focus:opacity-100" stroke="transparent" strokeWidth="2"><title>{`${domains[r.source].label} ke ${domains[r.target].label}: ${formatNumber(r.count)} relasi langsung`}</title></path></a>)}</g>
      {([left, right] as const).map((side, i) => side.map((n) => <g key={`${i}:${n.key}`}><rect x={i ? 610 : 178} y={n.y} width="12" height={n.height} rx="2" fill={color(n.key)} /><text x={i ? 632 : 168} y={n.y + n.height / 2} dominantBaseline="middle" textAnchor={i ? "start" : "end"} className="fill-foreground text-[11px] font-medium">{domains[n.key].label}<tspan x={i ? 632 : 168} dy="13" className="fill-muted-foreground text-[10px]">{formatNumber(n.count)} tautan</tspan></text></g>))}
    </svg></div>
    <p className="text-xs text-muted-foreground">{formatNumber(total)} relasi antardomain (pasangan record unik, sama dengan Integrasi Domain). Klik aliran untuk mencari record domain asal di Integrasi Domain. Dua kolom menunjukkan ujung relasi, bukan hubungan tidak langsung.</p>
  </div>;
}

/** Tata letak Sankey (murni, dihitung sekali per perubahan relasi). */
function sankeyLayout(relations: RelationSummary[]) {
  const groups = new Map<string, { source: DomainKey; target: DomainKey; count: number }>();
  for (const row of relations) {
    if (row.count <= 0) continue;
    const key = `${row.source}:${row.target}`;
    const group = groups.get(key) ?? { source: row.source, target: row.target, count: 0 };
    group.count += row.count; groups.set(key, group);
  }
  const flows = [...groups.values()].sort((a, b) => domainKeys.indexOf(a.source) - domainKeys.indexOf(b.source) || domainKeys.indexOf(a.target) - domainKeys.indexOf(b.target));
  const total = flows.reduce((n, row) => n + row.count, 0);
  if (!total) return null;
  const sources = domainKeys.filter((key) => flows.some((f) => f.source === key));
  const targets = domainKeys.filter((key) => flows.some((f) => f.target === key));
  const scale = (300 - (Math.max(sources.length, targets.length) - 1) * 28) / total;
  const layout = (keys: DomainKey[], side: "source" | "target") => {
    let y = 35;
    return keys.map((key) => { const count = flows.filter((f) => f[side] === key).reduce((n, f) => n + f.count, 0); const item = { key, y, height: count * scale, count }; y += item.height + 28; return item; });
  };
  const left = layout(sources, "source"), right = layout(targets, "target");
  const fromOffsets = new Map(left.map((n) => [n.key, n.y])), toOffsets = new Map(right.map((n) => [n.key, n.y]));
  const ribbons = flows.map((flow) => {
    const y1 = fromOffsets.get(flow.source)!, y2 = toOffsets.get(flow.target)!, height = flow.count * scale;
    fromOffsets.set(flow.source, y1 + height); toOffsets.set(flow.target, y2 + height);
    return { ...flow, path: `M190 ${y1} C365 ${y1},435 ${y2},610 ${y2} L610 ${y2 + height} C435 ${y2 + height},365 ${y1 + height},190 ${y1 + height} Z` };
  });
  return { total, left, right, ribbons };
}

/**
 * anime.js: pita Sankey "mengalir" dari kiri ke kanan saat pertama terlihat (lebar clipPath 0 → 800).
 * Satu atribut yang dianimasikan, dipicu sekali oleh IntersectionObserver; tanpa JS/motion tampil penuh.
 */
function useFlowReveal(ref: React.RefObject<SVGSVGElement | null>, key: number | undefined) {
  const played = useRef(false);
  useEffect(() => {
    const svg = ref.current;
    const rect = svg?.querySelector<SVGRectElement>("[data-flow]");
    if (!svg || !rect || played.current || !motionOk()) return;
    let undo: (() => void) | undefined;
    rect.setAttribute("width", "0");
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      played.current = true;
      loadAnime().then(({ animate }) => {
        const animation = animate(rect, { width: [0, 800], duration: 1100, ease: "inOut(2)" });
        undo = () => { animation.cancel(); rect.setAttribute("width", "800"); };
      });
    }, { rootMargin: "0px 0px -10% 0px" });
    observer.observe(svg);
    return () => { observer.disconnect(); if (undo) undo(); else rect.setAttribute("width", "800"); };
  }, [ref, key]);
}
