"use client";
import { useEffect, useRef } from "react";
import { animate, motionOk, stagger } from "@/components/motion/anime";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useInView } from "@/hooks/use-in-view";
import { muatanConfig, muatanKeys, type Muatan } from "@/lib/peta-rencana/muatan";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";


export type YearStat = { year: string; total: number; terlaksana: number; muatan: Partial<Record<Muatan, number>> };

/**
 * Lini waktu tahunan peta rencana (pola stepper/timeline 21st.dev): tiap tahun satu tonggak dengan cincin progres
 * terlaksana dan batang komposisi muatan. Garis progres sampai tahun berjalan dan cincin digambar anime.js saat terlihat;
 * klik tonggak untuk memfilter tahun.
 */
export function YearTrack({ stats, current, selected, onToggle, className }: { stats: YearStat[]; current: number; selected: string[]; onToggle: (year: string) => void; className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const [ref, inView] = useInView<HTMLDivElement>();
  const last = stats.length - 1;
  // Posisi tahun berjalan pada garis (0–1); di luar periode → penuh atau kosong.
  const reach = !stats.length ? 0 : current > Number(stats[last]!.year) ? 1 : current < Number(stats[0]!.year) ? 0 : (current - Number(stats[0]!.year)) / (last || 1);
  const signature = stats.map((s) => `${s.year}:${s.total}:${s.terlaksana}`).join();

  useEffect(() => {
    if (!inView || !root.current || !motionOk()) return;
    const el = root.current;
    const animations = [
      animate(el.querySelectorAll("[data-line]"), { scaleX: [0, 1], duration: 900, ease: "inOutQuad" }),
      animate(el.querySelectorAll("[data-node]"), { scale: [0.6, 1], opacity: [0, 1], duration: 500, delay: stagger(120, { start: 150 }), ease: "outBack" }),
      animate(el.querySelectorAll("[data-ring]"), { strokeDashoffset: { from: 100 }, duration: 800, delay: stagger(120, { start: 350 }), ease: "outQuad" }),
    ];
    return () => animations.forEach((a) => void a.revert());
  }, [inView, signature]);

  return (
    <Card data-reveal className={cn("gap-3", className)}>
      <CardHeader>
        <CardTitle as="h2" className="section-title">Lini waktu rencana</CardTitle>
      </CardHeader>
      <CardContent ref={ref} className="flex-1">
        <div ref={root} className="relative">
          {/* Garis horizontal (md ke atas) melewati pusat cincin tonggak pertama sampai terakhir. */}
          <div aria-hidden className="pointer-events-none absolute top-[2.4rem] hidden h-0.5 rounded-full bg-border md:block" style={{ left: `${50 / stats.length}%`, width: `${100 - 100 / stats.length}%` }}>
            <div data-line className="h-1 -translate-y-px origin-left rounded-full bg-brand-teal" style={{ width: `${100 * reach}%` }} />
          </div>
          <ol className="relative grid gap-3 md:grid-flow-col md:auto-cols-fr md:gap-2">
            {stats.map((s) => {
              const pct = s.total ? Math.round((s.terlaksana / s.total) * 100) : 0;
              const on = selected.includes(s.year);
              const dim = selected.length > 0 && !on;
              const now = Number(s.year) === current;
              return (
                <li key={s.year} className="relative min-w-0">
                  <button
                    type="button"
                    data-node
                    onClick={() => onToggle(s.year)}
                    aria-pressed={on}
                    aria-label={`${s.year}: ${formatNumber(s.total)} kegiatan, ${pct}% terlaksana`}
                    className={cn(
                      "group/node grid w-full grid-cols-[4rem_1fr] items-center gap-3 rounded-2xl p-2 text-left transition-all duration-200 md:grid-cols-1 md:justify-items-center md:text-center",
                      "hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                      on && "bg-accent ring-2 ring-brand-teal",
                      dim && "opacity-45",
                    )}
                  >
                    <span className="relative grid size-16 place-items-center rounded-full bg-card">
                      <svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90">
                        <circle cx="32" cy="32" r="27" fill="none" stroke="var(--muted)" strokeWidth="6" />
                        {pct > 0 && <circle data-ring cx="32" cy="32" r="27" fill="none" stroke="var(--brand-teal)" strokeWidth="6" strokeLinecap="round" pathLength={100} strokeDasharray="100" strokeDashoffset={100 - pct} />}
                      </svg>
                      <span className="text-sm font-bold tabular-nums">{pct}%</span>
                    </span>
                    <span className="grid w-full min-w-0 gap-1">
                      <span className="flex items-center gap-2 md:justify-center">
                        <span className="font-heading text-lg font-bold tabular-nums">{s.year}</span>
                        {now && <span className="rounded-full bg-brand-yellow px-2 py-0.5 text-[10px] font-semibold text-on-brand">berjalan</span>}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">{formatNumber(s.total)} kegiatan</span>
                      <span className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
                        {muatanKeys.map((k) =>
                          s.muatan[k] ? <span key={k} className="h-full transition-[width] duration-500" style={{ width: `${(s.muatan[k]! / (s.total || 1)) * 100}%`, background: `var(${muatanConfig[k].tone})` }} /> : null,
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
