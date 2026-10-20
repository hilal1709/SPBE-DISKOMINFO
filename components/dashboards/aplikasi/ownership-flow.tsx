"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { animate, motionOk, stagger } from "@/components/motion/anime";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useInView } from "@/hooks/use-in-view";
import { kepemilikanColor, kepemilikanOptions, type Kepemilikan } from "@/lib/aplikasi/reference";
import type { Aplikasi } from "@/lib/types";
import { cn } from "@/lib/utils";

const W = 520;
const H = 250;
const NODE = 10;
const GAP = 14;
const fmt = new Intl.NumberFormat("id-ID");

type Node = { code: string; label: string; count: number; y: number; h: number };

/** Susun simpul satu kolom: tinggi sebanding jumlah, sisa ruang dibagi rata sebagai jarak. */
function column(items: { code: string; label: string; count: number }[], scale: number): Node[] {
  let y = 0;
  return items.map((item) => {
    const node = { ...item, y, h: Math.max(item.count * scale, 2) };
    y += node.h + GAP;
    return node;
  });
}

/**
 * Alur kepemilikan → RAA Level 2 (sankey ringkas, terinspirasi pola "Sankey Diagram" 21st.dev).
 * Pita digambar dengan anime.js saat terlihat; klik pita atau simpul untuk memfilter.
 */
export function OwnershipFlowCard({
  rows,
  raa2,
  label,
  kepemilikan,
  selectedRaa2,
  onSelect,
  className,
}: {
  rows: Aplikasi[];
  /** Kode RAA L2 dalam urutan tampil. */
  raa2: string[];
  label: (code: string) => string;
  kepemilikan: string[];
  selectedRaa2: string[];
  /** Pasangan yang diklik; null = semua di sisi itu. */
  onSelect: (kepemilikan: Kepemilikan | null, raa2: string | null) => void;
  className?: string;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const [ref, inView] = useInView<HTMLDivElement>();
  const [hover, setHover] = useState<string | null>(null);

  const { left, right, links } = useMemo(() => {
    const count = (k: string, r: string) => rows.filter((a) => a.kepemilikan === k && a.raa2 === r).length;
    const owners = kepemilikanOptions.map((o) => ({ code: o.value, label: o.label, count: rows.filter((a) => a.kepemilikan === o.value).length })).filter((o) => o.count);
    const targets = raa2.map((code) => ({ code, label: label(code), count: rows.filter((a) => a.raa2 === code).length })).filter((o) => o.count);
    const scale = (H - GAP * (Math.max(owners.length, targets.length) - 1)) / (rows.length || 1);
    const left = column(owners, scale);
    const right = column(targets, scale);
    // Offset tumpukan pita di dalam tiap simpul.
    const outAt = new Map(left.map((n) => [n.code, n.y]));
    const inAt = new Map(right.map((n) => [n.code, n.y]));
    const links = left.flatMap((l) =>
      right.flatMap((r) => {
        const value = count(l.code, r.code);
        if (!value) return [];
        const w = value * scale;
        const y1 = outAt.get(l.code)! + w / 2;
        const y2 = inAt.get(r.code)! + w / 2;
        outAt.set(l.code, outAt.get(l.code)! + w);
        inAt.set(r.code, inAt.get(r.code)! + w);
        const mid = W / 2;
        return [{ id: `${l.code}:${r.code}`, from: l, to: r, value, w, d: `M ${NODE} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${W - NODE} ${y2}` }];
      }),
    );
    return { left, right, links };
  }, [rows, raa2, label]);

  const signature = links.map((l) => `${l.id}=${l.value}`).join();
  useEffect(() => {
    if (!inView || !svg.current || !motionOk()) return;
    const animation = animate(svg.current.querySelectorAll("[data-ribbon]"), { strokeDashoffset: [1, 0], duration: 1100, delay: stagger(70), ease: "outQuart" });
    return () => void animation.revert();
  }, [inView, signature]);

  const active = (k: string, r: string) => (!kepemilikan.length || kepemilikan.includes(k)) && (!selectedRaa2.length || selectedRaa2.includes(r));
  const filtered = kepemilikan.length > 0 || selectedRaa2.length > 0;

  return (
    <Card data-reveal className={cn("gap-3", className)}>
      <CardHeader>
        <CardTitle className="section-title">Alur kepemilikan ke RAA</CardTitle>
      </CardHeader>
      <CardContent ref={ref} className="flex-1">
        <svg ref={svg} viewBox={`-4 -4 ${W + 8} ${H + 8}`} className="w-full overflow-visible" role="group" aria-label="Alur jumlah aplikasi dari kepemilikan ke RAA Level 2">
          {links.map((link) => {
            const on = active(link.from.code, link.to.code);
            const lit = hover ? hover === link.id || hover === link.from.code || hover === link.to.code : on;
            return (
              <path
                key={link.id}
                data-ribbon
                d={link.d}
                pathLength={1}
                strokeDasharray={1}
                fill="none"
                strokeWidth={Math.max(link.w - 1.5, 1.5)}
                stroke={`var(${kepemilikanColor[link.from.code as Kepemilikan]})`}
                strokeOpacity={lit ? (hover ? 0.75 : filtered ? 0.7 : 0.45) : 0.12}
                role="button"
                tabIndex={0}
                aria-label={`${link.from.label} ke ${link.to.label}: ${fmt.format(link.value)} aplikasi`}
                aria-pressed={filtered && on}
                className="cursor-pointer transition-[stroke-opacity] duration-200 outline-none focus-visible:stroke-opacity-90"
                onMouseEnter={() => setHover(link.id)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(link.id)}
                onBlur={() => setHover(null)}
                onClick={() => onSelect(link.from.code as Kepemilikan, link.to.code)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onSelect(link.from.code as Kepemilikan, link.to.code))}
              >
                <title>{`${link.from.label} → ${link.to.label}: ${fmt.format(link.value)} aplikasi`}</title>
              </path>
            );
          })}
          {[
            ...left.map((n) => ({ n, x: 0, side: "left" as const, color: `var(${kepemilikanColor[n.code as Kepemilikan]})` })),
            ...right.map((n) => ({ n, x: W - NODE, side: "right" as const, color: "var(--foreground)" })),
          ].map(({ n, x, side, color }) => (
            <g
              key={n.code}
              className="cursor-pointer"
              onMouseEnter={() => setHover(n.code)}
              onMouseLeave={() => setHover(null)}
              onClick={() => (side === "left" ? onSelect(n.code as Kepemilikan, null) : onSelect(null, n.code))}
            >
              <rect x={x} y={n.y} width={NODE} height={n.h} rx={3} fill={color} />
              <text
                x={side === "left" ? NODE + 8 : W - NODE - 8}
                y={n.y + n.h / 2}
                dy="0.35em"
                textAnchor={side === "left" ? "start" : "end"}
                className="fill-foreground stroke-card text-[19px] font-medium sm:text-[13px] [paint-order:stroke] [stroke-width:4px]"
              >
                {n.label}
                <tspan className="fill-muted-foreground font-normal tabular-nums"> {fmt.format(n.count)}</tspan>
              </text>
            </g>
          ))}
        </svg>
      </CardContent>
    </Card>
  );
}
