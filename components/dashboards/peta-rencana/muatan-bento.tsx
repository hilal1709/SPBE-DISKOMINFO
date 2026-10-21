"use client";
import { CountUp } from "@/components/motion/count-up";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { muatanConfig, type Muatan } from "@/lib/peta-rencana/muatan";
import { cn } from "@/lib/utils";

/**
 * Bento grid muatan (pola bento 21st.dev): petak terbesar dua kali lebih lebar & tinggi, sisanya mengalir.
 * Warna petak = token muatan; klik petak untuk memfilter.
 */
export function MuatanBento({ counts, selected, onToggle, className }: { counts: [Muatan, number][]; selected: string[]; onToggle: (k: Muatan) => void; className?: string }) {
  const total = counts.reduce((n, [, v]) => n + v, 0);
  return (
    <Card className={cn("gap-3", className)}>
      <CardHeader>
        <CardTitle className="section-title">Muatan rencana</CardTitle>
      </CardHeader>
      <CardContent className="grid flex-1 auto-rows-[5.5rem] grid-cols-2 gap-2 sm:grid-cols-4">
        {counts.map(([k, n], i) => {
          const cfg = muatanConfig[k];
          const on = selected.includes(k);
          const dim = selected.length > 0 && !on;
          return (
            <button
              key={k}
              type="button"
              onClick={() => onToggle(k)}
              aria-pressed={on}
              style={{ ["--tone" as string]: `var(${cfg.tone})` }}
              className={cn(
                "group/tile relative flex flex-col justify-between overflow-hidden rounded-2xl border border-(--tone)/40 bg-(--tone)/12 p-3 text-left transition-all duration-300",
                "hover:-translate-y-0.5 hover:shadow-card focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                i === 0 && "col-span-2 row-span-2 p-4",
                i === 1 && "col-span-2",
                on && "border-transparent bg-(--tone) text-on-brand",
                dim && "opacity-45",
              )}
            >
              <span aria-hidden className="absolute -right-6 -bottom-6 size-20 rounded-full bg-(--tone)/25 transition-transform duration-500 group-hover/tile:scale-150" />
              <span className={cn("relative text-sm font-semibold", i === 0 && "text-base")}>{cfg.label}</span>
              <span className="relative flex items-baseline justify-between gap-2">
                <span className={cn("font-heading font-bold tabular-nums", i === 0 ? "text-4xl" : "text-2xl")}>
                  <CountUp value={n} />
                </span>
                <span className="text-xs tabular-nums opacity-75">{Math.round((n / (total || 1)) * 100)}%</span>
              </span>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
