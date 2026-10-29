"use client";
import { domainKeys, domains, type DomainKey } from "@/lib/domains";
import type { DomainNode, DomainEdge } from "@/lib/integrasi/model";
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

export function DomainMap({ nodes, edges, selected, onSelect, securityVisible }: {
  nodes: DomainNode[]; edges: DomainEdge[]; selected: string | null;
  onSelect: (domain: DomainKey) => void; securityVisible: boolean;
}) {
  const columns = domainKeys.filter((d) => d !== "keamanan" || securityVisible);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const linked = new Set<string>();
  const totals = new Map<DomainKey, number>();
  const relations = new Map<string, { source: DomainKey; target: DomainKey; count: number }>();
  for (const n of nodes) totals.set(n.domain, (totals.get(n.domain) ?? 0) + 1);
  for (const e of edges) {
    const a = byId.get(e.source), b = byId.get(e.target);
    if (!a || !b) continue;
    linked.add(a.id); linked.add(b.id);
    if (a.domain === b.domain) continue;
    const [source, target] = [a.domain, b.domain].sort() as [DomainKey, DomainKey];
    const key = source + ":" + target;
    const row = relations.get(key) ?? { source, target, count: 0 };
    row.count++; relations.set(key, row);
  }
  return <div className="grid gap-4">
    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
      <span><strong>{format(edges.length)}</strong> relasi</span>
      <span><strong>{nodes.length ? Math.round(linked.size / nodes.length * 100) : 0}%</strong> record terhubung</span>
      <span className="text-muted-foreground">Klik domain untuk melihat record.</span>
    </div>
    <div className="relative mx-auto hidden aspect-[920/550] w-full max-w-[680px] rounded-2xl bg-muted/30 md:block">
      <svg viewBox="0 0 920 550" className="absolute inset-0 size-full" aria-hidden="true">
        {[...relations.entries()].map(([key, row]) => {
          const a = positions[row.source], b = positions[row.target];
          const active = !selected || selected === row.source || selected === row.target;
          const cx = (a.x + b.x) / 2 + (a.x === b.x ? (row.source === "aplikasi" ? -110 : 110) : 0);
          const cy = (a.y + b.y) / 2 + (a.y === b.y ? -85 : 0);
          const x = (a.x + 2 * cx + b.x) / 4, y = (a.y + 2 * cy + b.y) / 4;
          return <g key={key} opacity={active ? 1 : 0.15}>
            <path d={`M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`} fill="none" stroke={`var(${a.color})`} strokeWidth={Math.min(12, 2 + Math.log2(row.count + 1))} strokeOpacity={0.55} />
            <rect x={x - 40} y={y - 12} width={80} height={24} rx={12} className="fill-card stroke-border" />
            <text x={x} y={y + 4} textAnchor="middle" className="fill-foreground text-[11px] font-semibold">{format(row.count)} relasi</text>
          </g>;
        })}
      </svg>
      {columns.map((d) => <button key={d} type="button" aria-pressed={selected === d} onClick={() => onSelect(d)}
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
