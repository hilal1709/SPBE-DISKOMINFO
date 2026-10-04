"use client";
import { BarChart } from "@/components/charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { jenisOptions, sifatOptions, type Sifat } from "@/lib/data/reference";
import type { DataInfo } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Warna seri sama dengan rincian sifat di kartu jumlah data. */
export const sifatColor: Record<Sifat, string> = { terbuka: "--brand-teal", terbatas: "--brand-yellow", tertutup: "--brand-orange" };

/** Batang bertumpuk Jenis × Sifat data. Klik segmen untuk memfilter pasangan jenis dan sifat. */
export function SifatJenisCard({
  rows,
  sifat,
  jenis,
  onSelect,
  className,
}: {
  rows: DataInfo[];
  /** Sifat & jenis yang sedang difilter. */
  sifat: string[];
  jenis: string[];
  onSelect: (jenis: string, sifat: string) => void;
  className?: string;
}) {
  const count = (j: string, s: string) => rows.filter((d) => d.jenis === j && d.sifat === s).length;
  const selected = jenisOptions.flatMap((j, label) => sifatOptions.flatMap((s, series) => (jenis.includes(j.value) && sifat.includes(s.value) ? [{ label, series }] : [])));

  return (
    <Card data-reveal className={cn("gap-3", className)}>
      <CardHeader>
        <CardTitle className="section-title">Jenis × sifat data</CardTitle>
      </CardHeader>
      <CardContent className="min-h-72 flex-1">
        <BarChart
          horizontal
          stacked
          labels={jenisOptions.map((j) => j.label)}
          series={sifatOptions.map((s) => ({ label: s.label, data: jenisOptions.map((j) => count(j.value, s.value)), color: sifatColor[s.value] }))}
          selected={selected}
          onSelect={(label, series) => onSelect(jenisOptions[label]!.value, sifatOptions[series]!.value)}
        />
      </CardContent>
    </Card>
  );
}
