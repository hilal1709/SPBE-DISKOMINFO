"use client";
import { useEffect, useRef, useState } from "react";
import { animate, motionOk, stagger } from "@/components/motion/anime";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useInView } from "@/hooks/use-in-view";
import { kegiatanConfig, kegiatanKeys, type Kegiatan } from "@/lib/keamanan/jenis";
import { cn } from "@/lib/utils";

const fmt = new Intl.NumberFormat("id-ID");
const C = 180;
const R = 104;
const WIDTH = 30;
const GAP = 1.6;

const point = (deg: number, r: number) => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [C + r * Math.cos(rad), C + r * Math.sin(rad)] as const;
};
const arc = (from: number, to: number) => {
  const [x1, y1] = point(from, R);
  const [x2, y2] = point(to, R);
  return `M ${x1} ${y1} A ${R} ${R} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2}`;
};

/**
 * Siklus keamanan SPBE: donat proporsional dengan urutan tetap dari standar sampai kelaikan (searah jarum jam).
 * Segmen digambar berurutan dengan anime.js saat terlihat; klik segmen untuk memfilter.
 */
export function CycleRingCard({ counts, selected, onToggle, className }: { counts: Map<string, number>; selected: string[]; onToggle: (k: Kegiatan) => void; className?: string }) {
  const svg = useRef<SVGSVGElement>(null);
  const [ref, inView] = useInView<HTMLDivElement>();
  const [hover, setHover] = useState<Kegiatan | null>(null);
  const total = kegiatanKeys.reduce((n, k) => n + (counts.get(k) ?? 0), 0);
  const focus = hover ?? (selected.length === 1 ? (selected[0] as Kegiatan) : null);

  // Sudut kumulatif; kegiatan tanpa data tidak mendapat segmen.
  const segments = kegiatanKeys
    .map((k) => ({ k, n: counts.get(k) ?? 0 }))
    .filter((s) => s.n > 0)
    .reduce<{ k: Kegiatan; n: number; from: number; to: number }[]>((list, s) => {
      const from = list.at(-1)?.to ?? 0;
      return [...list, { ...s, from, to: from + (s.n / (total || 1)) * 360 }];
    }, []);
  const single = segments.length === 1;

  const signature = segments.map((s) => `${s.k}=${s.n}`).join();
  useEffect(() => {
    if (!inView || !svg.current || !motionOk()) return;
    const animation = animate(svg.current.querySelectorAll("[data-fill]"), { strokeDashoffset: [1, 0], duration: 420, delay: stagger(140), ease: "outQuad" });
    return () => void animation.revert();
  }, [inView, signature]);

  return (
    <Card data-reveal className={cn("gap-3", className)}>
      <CardHeader>
        <CardTitle className="section-title">Siklus keamanan</CardTitle>
      </CardHeader>
      <CardContent ref={ref} className="flex flex-1 items-center justify-center">
        <svg ref={svg} viewBox="-70 0 500 360" className="w-full max-w-[32rem] overflow-visible" role="group" aria-label="Jumlah kegiatan per tahap siklus keamanan SPBE">
          {!segments.length && <circle cx={C} cy={C} r={R} fill="none" stroke="var(--muted)" strokeWidth={WIDTH} />}
          {segments.map((s) => {
            const cfg = kegiatanConfig[s.k];
            const on = selected.includes(s.k);
            const dim = (selected.length > 0 && !on) || (hover !== null && hover !== s.k);
            const mid = (s.from + s.to) / 2;
            const [lx, ly] = point(mid, R + WIDTH / 2 + 18);
            const anchor = lx > C + 8 ? "start" : lx < C - 8 ? "end" : "middle";
            const d = single ? arc(0, 359.99) : arc(s.from + GAP / 2, s.to - GAP / 2);
            return (
              <g
                key={s.k}
                role="button"
                tabIndex={0}
                aria-pressed={on}
                aria-label={`${cfg.label}: ${fmt.format(s.n)} kegiatan`}
                className="cursor-pointer outline-none"
                onMouseEnter={() => setHover(s.k)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(s.k)}
                onBlur={() => setHover(null)}
                onClick={() => onToggle(s.k)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onToggle(s.k))}
              >
                <path
                  data-fill
                  d={d}
                  pathLength={1}
                  strokeDasharray={1}
                  fill="none"
                  stroke={`var(${cfg.tone})`}
                  strokeWidth={on || hover === s.k ? WIDTH + 8 : WIDTH}
                  strokeOpacity={dim ? 0.3 : 1}
                  className="transition-[stroke-opacity,stroke-width] duration-200"
                />
                <text x={lx} y={ly} dy="0.35em" textAnchor={anchor} className={cn("fill-foreground text-[15px] font-medium sm:text-[12px]", dim && "fill-muted-foreground")}>
                  {cfg.short}
                  <tspan className="fill-muted-foreground font-normal tabular-nums"> {fmt.format(s.n)}</tspan>
                </text>
              </g>
            );
          })}
          <text x={C} y={C - 6} textAnchor="middle" className="fill-foreground text-[34px] font-bold tabular-nums">
            {fmt.format(focus ? (counts.get(focus) ?? 0) : total)}
          </text>
          <text x={C} y={C + 20} textAnchor="middle" className="fill-muted-foreground text-[13px]">
            {focus ? kegiatanConfig[focus].short.toLowerCase() : "kegiatan"}
          </text>
        </svg>
      </CardContent>
    </Card>
  );
}
