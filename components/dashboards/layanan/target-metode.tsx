"use client";
import { BarChart } from "@/components/charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { metodeOptions, targetOptions, type Metode } from "@/lib/layanan/reference";
import type { Layanan } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Warna seri sama dengan rincian metode di kartu digitalisasi. */
const metodeColor: Record<Metode, string> = { elektronik: "--brand-teal", hybrid: "--brand-sky", tatap_muka: "--brand-charcoal" };

/** Batang bertumpuk Target × Metode layanan. Klik segmen untuk memfilter pasangan target dan metode. */
export function TargetMetodeCard({
  rows,
  target,
  metode,
  onSelect,
  className,
}: {
  rows: Layanan[];
  /** Target & metode yang sedang difilter. */
  target: string[];
  metode: string[];
  onSelect: (target: string, metode: string) => void;
  className?: string;
}) {
  const count = (t: string, m: string) => rows.filter((l) => l.target === t && l.metode === m).length;
  const selected = targetOptions.flatMap((t, label) => metodeOptions.flatMap((m, series) => (target.includes(t.value) && metode.includes(m.value) ? [{ label, series }] : [])));

  return (
    <Card data-reveal className={cn("gap-3", className)}>
      <CardHeader>
        <CardTitle className="section-title">Target × metode layanan</CardTitle>
      </CardHeader>
      <CardContent className="min-h-72 flex-1">
        <BarChart
          horizontal
          stacked
          labels={targetOptions.map((t) => t.label)}
          series={metodeOptions.map((m) => ({ label: m.label, data: targetOptions.map((t) => count(t.value, m.value)), color: metodeColor[m.value] }))}
          selected={selected}
          onSelect={(label, series) => onSelect(targetOptions[label]!.value, metodeOptions[series]!.value)}
        />
      </CardContent>
    </Card>
  );
}
