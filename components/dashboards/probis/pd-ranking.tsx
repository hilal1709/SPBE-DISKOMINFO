"use client";
import { Fragment, useRef, useState } from "react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/icon";
import { CountUp } from "@/components/motion/count-up";
import { MOTION_OK, gsap, useGSAP } from "@/components/motion/gsap";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type PdRow = { code: string; name: string; count: number; sektor: [string, number][] };

const fmt = new Intl.NumberFormat("id-ID");

/** Rekap jumlah per Perangkat Daerah. Klik nama untuk memfilter, panah untuk rincian sektor. */
export function PdRankingCard({
  rows,
  selected,
  onToggle,
  label,
  className,
  title = "Proses bisnis per Perangkat Daerah",
  unit = "probis",
  colorOf,
}: {
  rows: PdRow[];
  selected: string[];
  onToggle: (code: string) => void;
  /** Label referensi "kode nama" (RAB sesuai versi periode, atau RAL). */
  label: (code: string) => string;
  className?: string;
  title?: string;
  unit?: string;
  /** Token warna per kode sektor; bila ada, bar dipecah per sektor. */
  colorOf?: (code: string) => string;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const list = useRef<HTMLOListElement>(null);

  useGSAP(
    () => {
      if (!open) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.from("[data-detail]", { height: 0, opacity: 0, paddingTop: 0, paddingBottom: 0, duration: 0.35, ease: "power2.out", clearProps: "all" });
        gsap.from("[data-detail] > *", { opacity: 0, y: -4, stagger: 0.03, duration: 0.3, delay: 0.1, clearProps: "all" });
      });
    },
    { dependencies: [open], scope: list },
  );
  const max = rows[0]?.count ?? 1;
  const total = rows.reduce((sum, r) => sum + r.count, 0);

  return (
    <Card data-reveal className={cn("gap-3", className)}>
      <CardHeader>
        <CardTitle className="section-title">{title}</CardTitle>
      </CardHeader>
      <CardContent className="max-h-[26rem] overflow-y-auto px-3">
        <ol ref={list} className="grid gap-0.5">
          {rows.map((row, i) => {
            const active = selected.includes(row.code);
            const isOpen = open === row.code;
            return (
              <Fragment key={row.code}>
                <li className={cn("flex items-center gap-1 rounded-lg transition-colors", active ? "bg-accent" : "hover:bg-muted/60", selected.length > 0 && !active && "opacity-60")}>
                  <button type="button" onClick={() => onToggle(row.code)} aria-pressed={active} className="grid min-w-0 flex-1 gap-1 rounded-lg px-2 py-1.5 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                    <span className="flex min-w-0 items-baseline gap-2 text-xs">
                      <span className="w-5 shrink-0 text-right text-muted-foreground tabular-nums">{i + 1}</span>
                      <span className="truncate font-medium">{row.name}</span>
                      <b className="ml-auto tabular-nums"><CountUp instant value={row.count} /></b>
                    </span>
                    <span className="ml-7 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                      <span className="flex h-full overflow-hidden rounded-full bg-brand-amber transition-[width] duration-700 ease-(--ease-out)" style={{ width: `${(row.count / max) * 100}%` }}>
                        {colorOf && row.sektor.map(([code, n]) => <span key={code} className="h-full" style={{ width: `${(n / row.count) * 100}%`, background: `var(${colorOf(code)})` }} />)}
                      </span>
                    </span>
                  </button>
                  <Button variant="ghost" size="icon-xs" aria-expanded={isOpen} aria-label={`Rincian ${row.name}`} onClick={() => setOpen(isOpen ? null : row.code)}>
                    <Icon icon={ArrowRight01Icon} size={14} className={cn("transition-transform duration-200", isOpen && "rotate-90")} />
                  </Button>
                </li>
                {isOpen && (
                  <li data-detail className="mb-1 ml-9 grid gap-1 overflow-hidden rounded-lg bg-muted/50 px-3 py-2 text-[11px]">
                    {row.sektor.map(([code, n]) => (
                      <span key={code} className="flex items-center gap-2">
                        {colorOf && <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: `var(${colorOf(code)})` }} />}
                        <span className="flex-1 truncate text-muted-foreground">{label(code)}</span>
                        <b className="tabular-nums">{n}</b>
                      </span>
                    ))}
                  </li>
                )}
              </Fragment>
            );
          })}
        </ol>
      </CardContent>
      <p className="mx-6 flex justify-between border-t pt-3 text-xs font-semibold">
        {rows.length} Perangkat Daerah <span className="tabular-nums">{fmt.format(total)} {unit}</span>
      </p>
    </Card>
  );
}
