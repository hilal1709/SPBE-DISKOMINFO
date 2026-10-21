"use client";
import { useEffect, useRef } from "react";
import { animate, motionOk, stagger } from "@/components/motion/anime";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useInView } from "@/hooks/use-in-view";

const fmt = new Intl.NumberFormat("id-ID");

/**
 * Corong tindak lanjut gap (pola funnel 21st.dev): ditemukan → diusulkan ke Peta Rencana → ditindaklanjuti.
 * Tiap tahap trapesium yang lebarnya sebanding jumlahnya; tumbuh dari tengah dengan anime.js saat terlihat.
 */
export function GapFunnel({ found, proposed, done, className }: { found: number; proposed: number; done: number; className?: string }) {
  const svg = useRef<SVGSVGElement>(null);
  const [ref, inView] = useInView<HTMLDivElement>();
  const stages = [
    { label: "Ditemukan", n: found, tone: "--brand-orange" },
    { label: "Diusulkan ke Peta Rencana", n: proposed, tone: "--brand-amber" },
    { label: "Ditindaklanjuti", n: done, tone: "--brand-teal" },
  ];
  // Lebar minimum agar tahap kecil tetap terbaca.
  const width = (n: number) => 60 + (n / (found || 1)) * 240;
  const signature = `${found}:${proposed}:${done}`;

  useEffect(() => {
    if (!inView || !svg.current || !motionOk()) return;
    const animation = animate(svg.current.querySelectorAll("[data-stage]"), { scaleX: [0, 1], opacity: [0, 1], duration: 600, delay: stagger(160), ease: "outQuart" });
    return () => void animation.revert();
  }, [inView, signature]);

  return (
    <Card data-reveal className={className}>
      <CardHeader>
        <CardTitle className="section-title">Alur tindak lanjut</CardTitle>
      </CardHeader>
      <CardContent ref={ref} className="flex flex-1 items-center justify-center">
        <svg ref={svg} viewBox="0 0 360 200" className="w-full max-w-md" role="img" aria-label={stages.map((s) => `${s.label} ${s.n}`).join(", ")}>
          {stages.map((s, i) => {
            const top = width(s.n);
            const bottom = width(stages[i + 1]?.n ?? s.n * 0.9);
            const y = i * 64;
            return (
              <g key={s.label} data-stage style={{ transformOrigin: "180px 0", transformBox: "view-box" }}>
                <path d={`M ${180 - top / 2} ${y} L ${180 + top / 2} ${y} L ${180 + bottom / 2} ${y + 56} L ${180 - bottom / 2} ${y + 56} Z`} fill={`var(${s.tone})`} strokeLinejoin="round" stroke={`var(${s.tone})`} strokeWidth={6} />
                <text x={180} y={y + 25} textAnchor="middle" className="fill-[var(--on-brand)] text-[18px] font-bold tabular-nums">{fmt.format(s.n)}</text>
                <text x={180} y={y + 43} textAnchor="middle" className="fill-[var(--on-brand)] text-[10px] font-medium">{s.label}</text>
              </g>
            );
          })}
        </svg>
      </CardContent>
    </Card>
  );
}
