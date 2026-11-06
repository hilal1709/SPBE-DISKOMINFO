"use client";
import { useEffect, useMemo } from "react";
import { loadAnime, motionOk } from "@/components/motion/anime-lazy";
import { useInView } from "@/hooks/use-in-view";
import { domainKeys, domains, type DomainKey } from "@/lib/domains";
import type { DomainNode } from "@/lib/integrasi/model";
import { cn } from "@/lib/utils";

const positions: Record<DomainKey, { x: number; y: number; color: string }> = {
  probis: { x: 140, y: 270, color: "--brand-orange" },
  layanan: { x: 460, y: 95, color: "--brand-sky" },
  data: { x: 460, y: 270, color: "--brand-teal" },
  aplikasi: { x: 460, y: 445, color: "--brand-charcoal" },
  infrastruktur: { x: 780, y: 270, color: "--brand-amber" },
  keamanan: { x: 780, y: 445, color: "--brand-yellow" },
};
const format = (n: number) => n.toLocaleString("id-ID");

/** Peta domain. `pairs` = relationPairs(nodes, edges), dihitung sekali di induk dan dipakai juga untuk StatRow. */
export function DomainMap({ nodes, pairs, selected, onSelect, securityVisible }: {
  nodes: DomainNode[]; pairs: [DomainNode, DomainNode][]; selected: string | null;
  onSelect: (domain: DomainKey) => void; securityVisible: boolean;
}) {
  const columns = domainKeys.filter((d) => d !== "keamanan" || securityVisible);
  const totals = useMemo(() => {
    const map = new Map<DomainKey, number>();
    for (const n of nodes) map.set(n.domain, (map.get(n.domain) ?? 0) + 1);
    return map;
  }, [nodes]);
  const relations = useMemo(() => {
    const map = new Map<string, { source: DomainKey; target: DomainKey; count: number }>();
    for (const [a, b] of pairs) {
      const [source, target] = [a.domain, b.domain].sort() as [DomainKey, DomainKey];
      const key = source + ":" + target;
      const row = map.get(key) ?? { source, target, count: 0 };
      row.count++; map.set(key, row);
    }
    return map;
  }, [pairs]);

  // anime.js: garis relasi tergambar dan simpul domain muncul saat peta pertama terlihat (sekali, lazy).
  const [ref, inView] = useInView<HTMLDivElement>();
  const signature = [...relations.keys()].join();
  useEffect(() => {
    const el = ref.current;
    if (!inView || !el || !motionOk()) return;
    let undo: (() => void) | undefined;
    let active = true;
    loadAnime().then(({ createTimeline, stagger }) => {
      if (!active) return;
      const lines = el.querySelectorAll("[data-line]"), nodesEl = el.querySelectorAll("[data-node]"), labels = el.querySelectorAll("[data-count]");
      const timeline = createTimeline();
      if (nodesEl.length) timeline.add(nodesEl, { scale: [0.85, 1], opacity: [0, 1], duration: 450, delay: stagger(60), ease: "out(3)" }, 0);
      if (lines.length) timeline.add(lines, { strokeDashoffset: [1, 0], duration: 900, delay: stagger(70), ease: "inOut(2)" }, 150);
      if (labels.length) timeline.add(labels, { opacity: [0, 1], duration: 300, delay: stagger(50) }, 700);
      undo = () => void timeline.revert();
    });
    return () => { active = false; undo?.(); };
  }, [inView, signature, ref]);

  return <div ref={ref} className="grid gap-4">
    <p className="text-sm text-muted-foreground">Klik domain untuk melihat record.</p>
    <div className="relative mx-auto hidden aspect-[920/550] w-full max-w-[680px] rounded-2xl bg-muted/30 md:block">
      <svg viewBox="0 0 920 550" className="absolute inset-0 size-full" aria-hidden="true">
        {[...relations.entries()].map(([key, row]) => {
          const a = positions[row.source], b = positions[row.target];
          const active = !selected || selected === row.source || selected === row.target;
          const cx = (a.x + b.x) / 2 + (a.x === b.x ? (row.source === "aplikasi" ? -110 : 110) : 0);
          const cy = (a.y + b.y) / 2 + (a.y === b.y ? -85 : 0);
          const x = (a.x + 2 * cx + b.x) / 4, y = (a.y + 2 * cy + b.y) / 4;
          return <g key={key} opacity={active ? 1 : 0.15}>
            <path data-line pathLength={1} strokeDasharray={1} d={`M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`} fill="none" stroke={`var(${a.color})`} strokeWidth={Math.min(12, 2 + Math.log2(row.count + 1))} strokeOpacity={0.55} />
            <g data-count><rect x={x - 40} y={y - 12} width={80} height={24} rx={12} className="fill-card stroke-border" />
            <text x={x} y={y + 4} textAnchor="middle" className="fill-foreground text-[11px] font-semibold">{format(row.count)} relasi</text></g>
          </g>;
        })}
      </svg>
      {columns.map((d) => <button key={d} data-node type="button" aria-pressed={selected === d} onClick={() => onSelect(d)}
        style={{ left: `${positions[d].x / 920 * 100}%`, top: `${positions[d].y / 550 * 100}%`, backgroundColor: `var(${positions[d].color})` }}
        className={cn("absolute flex aspect-square w-[16%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-4 border-background p-2 text-center text-on-brand shadow-card transition-shadow hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring", d === "aplikasi" && "text-primary-foreground", selected === d && "ring-2 ring-foreground ring-offset-4 ring-offset-background")}>
        <span className="text-xs font-bold">{domains[d].label}</span>
        <span className="mt-1 text-lg font-bold">{format(totals.get(d) ?? 0)}</span>
        <span className="text-[10px]">record</span>
      </button>)}
    </div>
    <div className="grid grid-cols-2 gap-3 md:hidden">
      {columns.map((d) => <button key={d} type="button" aria-pressed={selected === d} onClick={() => onSelect(d)}
        style={{ backgroundColor: `var(${positions[d].color})` }}
        className={cn("min-w-0 rounded-xl p-4 text-left text-on-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring", d === "aplikasi" && "text-primary-foreground", selected === d && "ring-2 ring-foreground ring-offset-2 ring-offset-background")}>
        <span className="block text-sm font-semibold">{domains[d].label}</span>
        <span className="mt-2 block text-xl font-bold">{format(totals.get(d) ?? 0)} <span className="text-xs font-normal">record</span></span>
      </button>)}
      <ul className="col-span-2 divide-y text-sm">
        {[...relations.entries()].filter(([, r]) => !selected || r.source === selected || r.target === selected).map(([key, r]) => <li key={key} className="flex items-center justify-between gap-3 py-3"><span>{domains[r.source].label} · {domains[r.target].label}</span><span className="shrink-0 font-semibold">{format(r.count)} relasi</span></li>)}
      </ul>
    </div>
    {!relations.size && <p className="text-sm text-muted-foreground">Belum ada relasi antardomain dalam cakupan ini.</p>}
  </div>;
}
