"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { animate, motionOk, stagger } from "@/components/motion/anime";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useInView } from "@/hooks/use-in-view";
import { jenisConfig, type InfraJenis } from "@/lib/infrastruktur/jenis";
import type { Infrastruktur } from "@/lib/types";
import { cn } from "@/lib/utils";

const W = 560;
const H = 300;
const fmt = new Intl.NumberFormat("id-ID");

type NodeKey = InfraJenis | "aplikasi" | "data";
/** Kolom dari pengguna (aplikasi & data) ke fasilitas fisik: sistem integrasi → platform → fasilitas & perangkat. */
const columns: NodeKey[][] = [
  ["aplikasi", "data"],
  ["splp", "jip"],
  ["cloud", "server", "platform", "penyimpanan"],
  ["fasilitas", "jaringan", "perangkat_keamanan", "periferal"],
];
const X = [44, 200, 360, 516];
const label = (k: NodeKey) => (k === "aplikasi" ? "Aplikasi" : k === "data" ? "Data" : jenisConfig[k].short);
const tone = (k: NodeKey) => (k === "aplikasi" ? "--brand-orange" : k === "data" ? "--brand-sky" : jenisConfig[k].tone);

/**
 * Peta keterhubungan komponen (pola "network graph" 21st.dev): simpul = komponen per jenis, garis = jumlah relasi
 * antar-jenis plus aplikasi & data yang memakainya. Garis digambar anime.js saat terlihat; klik simpul untuk memfilter.
 */
export function LinkMapCard({ rows, selected, onToggle, className }: { rows: Infrastruktur[]; selected: string[]; onToggle: (jenis: InfraJenis) => void; className?: string }) {
  const svg = useRef<SVGSVGElement>(null);
  const [ref, inView] = useInView<HTMLDivElement>();
  const [hover, setHover] = useState<NodeKey | null>(null);

  const { nodes, edges } = useMemo(() => {
    const count = new Map<NodeKey, number>();
    for (const r of rows) count.set(r.jenis, (count.get(r.jenis) ?? 0) + 1);
    count.set("aplikasi", new Set(rows.flatMap((r) => r.aplikasi.map((a) => a.id))).size);
    count.set("data", new Set(rows.flatMap((r) => r.data.map((d) => d.id))).size);
    const max = Math.max(1, ...count.values());
    const nodes = new Map(
      columns.flatMap((col, ci) =>
        col.map((k, i) => {
          const n = count.get(k) ?? 0;
          return [k, { key: k, n, x: X[ci]!, y: ((i + 0.5) * H) / col.length, r: n ? 7 + 15 * Math.sqrt(n / max) : 5 }] as const;
        }),
      ),
    );
    // Relasi tak berarah antar-jenis: pasangan diurutkan menurut kolom agar garis selalu ke kanan.
    const order = (k: NodeKey) => columns.findIndex((c) => c.includes(k));
    const weight = new Map<string, number>();
    const add = (a: NodeKey, b: NodeKey, n = 1) => {
      if (a === b) return;
      const [p, q] = order(a) <= order(b) ? [a, b] : [b, a];
      weight.set(`${p}|${q}`, (weight.get(`${p}|${q}`) ?? 0) + n);
    };
    for (const r of rows) {
      for (const t of r.relasi) add(r.jenis, t.jenis);
      if (r.aplikasi.length) add("aplikasi", r.jenis, r.aplikasi.length);
      if (r.data.length) add("data", r.jenis, r.data.length);
    }
    const top = Math.max(1, ...weight.values());
    const edges = [...weight].map(([id, n]) => {
      const [a, b] = id.split("|") as [NodeKey, NodeKey];
      const p = nodes.get(a)!;
      const q = nodes.get(b)!;
      const sameColumn = p.x === q.x;
      const mid = (p.x + q.x) / 2;
      // Satu kolom (mis. server ↔ platform): lengkung ke kanan agar tidak menumpuk di atas simpul.
      const d = sameColumn ? `M ${p.x} ${p.y} C ${p.x + 70} ${p.y}, ${q.x + 70} ${q.y}, ${q.x} ${q.y}` : `M ${p.x} ${p.y} C ${mid} ${p.y}, ${mid} ${q.y}, ${q.x} ${q.y}`;
      return { id, a, b, n, d, w: 1.5 + 7 * (n / top) };
    });
    return { nodes: [...nodes.values()], edges: edges.sort((x, y) => y.n - x.n) };
  }, [rows]);

  const signature = edges.map((e) => `${e.id}=${e.n}`).join();
  useEffect(() => {
    if (!inView || !svg.current || !motionOk()) return;
    const lines = animate(svg.current.querySelectorAll("[data-edge]"), { strokeDashoffset: [1, 0], duration: 1000, delay: stagger(45), ease: "outQuart" });
    const dots = animate(svg.current.querySelectorAll("[data-node]"), { scale: [0, 1], duration: 600, delay: stagger(40, { start: 200 }), ease: "outBack" });
    return () => {
      lines.revert();
      dots.revert();
    };
  }, [inView, signature]);

  const filtered = selected.length > 0;
  const lit = (e: { a: NodeKey; b: NodeKey }) => (hover ? e.a === hover || e.b === hover : !filtered || selected.includes(e.a) || selected.includes(e.b));

  return (
    <Card data-reveal className={cn("gap-3", className)}>
      <CardHeader>
        <CardTitle className="section-title">Peta keterhubungan</CardTitle>
      </CardHeader>
      <CardContent ref={ref} className="flex-1">
        <svg ref={svg} viewBox={`-40 -14 ${W + 100} ${H + 40}`} className="w-full overflow-visible" role="group" aria-label="Keterhubungan aplikasi, data, dan komponen infrastruktur">
          {edges.map((e) => (
            <path
              key={e.id}
              data-edge
              d={e.d}
              pathLength={1}
              strokeDasharray={1}
              fill="none"
              strokeLinecap="round"
              strokeWidth={e.w}
              stroke={`var(${tone(e.a === "aplikasi" || e.a === "data" ? e.a : e.b)})`}
              strokeOpacity={lit(e) ? (hover ? 0.8 : 0.5) : 0.1}
              className="transition-[stroke-opacity] duration-200"
            >
              <title>{`${label(e.a)} ↔ ${label(e.b)}: ${fmt.format(e.n)} relasi`}</title>
            </path>
          ))}
          {nodes.map((n) => {
            const clickable = n.key !== "aplikasi" && n.key !== "data" && n.n > 0;
            const on = selected.includes(n.key);
            return (
              <g
                key={n.key}
                transform={`translate(${n.x} ${n.y})`}
                role={clickable ? "button" : undefined}
                tabIndex={clickable ? 0 : undefined}
                aria-pressed={clickable ? on : undefined}
                aria-label={`${label(n.key)}: ${fmt.format(n.n)}`}
                className={cn("outline-none", clickable && "cursor-pointer")}
                onMouseEnter={() => setHover(n.key)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(n.key)}
                onBlur={() => setHover(null)}
                onClick={() => clickable && onToggle(n.key as InfraJenis)}
                onKeyDown={(e) => clickable && (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onToggle(n.key as InfraJenis))}
              >
                <g data-node style={{ transformBox: "fill-box", transformOrigin: "center" }}>
                  <circle r={n.r + (on ? 4 : 0)} fill={`var(${tone(n.key)})`} fillOpacity={n.n ? (filtered && !on ? 0.35 : 1) : 0.2} stroke="var(--card)" strokeWidth={3} />
                  {on && <circle r={n.r + 8} fill="none" stroke={`var(${tone(n.key)})`} strokeWidth={2} strokeDasharray="3 3" />}
                </g>
                <text y={n.r + 15} textAnchor="middle" className="fill-foreground stroke-card text-[17px] font-medium sm:text-[12px] [paint-order:stroke] [stroke-width:4px]">
                  {label(n.key)}
                  <tspan className="fill-muted-foreground font-normal tabular-nums"> {fmt.format(n.n)}</tspan>
                </text>
              </g>
            );
          })}
        </svg>
      </CardContent>
    </Card>
  );
}
