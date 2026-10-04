"use client";
import { useState } from "react";
import { DataTable } from "@/components/blocks/data-table";
import { DetailDialog, DetailField, DetailSection } from "@/components/blocks/detail-dialog";
import { FilterBar } from "@/components/blocks/filter-bar";
import { HeatTile } from "@/components/blocks/heat-tile";
import { StatCard } from "@/components/blocks/stat-card";
import { StatusBadge } from "@/components/blocks/status-badge";
import { BarChart, DoughnutChart } from "@/components/charts";
import { Meter } from "@/components/motion/meter";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { opdList, rabList, services } from "@/lib/demo-data";
import type { Service } from "@/lib/types";

const years = ["2025", "2026", "2027", "2028", "2029"];
const trend = [
  { label: "AS-IS", data: [1513, 1460, 1402, 1351, 1298], color: "--brand-teal" },
  { label: "Upgrade", data: [143, 168, 190, 214, 236], color: "--brand-yellow" },
  { label: "Baru", data: [189, 221, 258, 290, 327], color: "--brand-orange" },
];
const sectors = [
  { label: "RAB.02 Ekonomi dan Industri", value: 2316 },
  { label: "RAB.03 Pembangunan dan Kewilayahan", value: 238 },
  { label: "RAB.09 Pemerintahan Umum", value: 187 },
  { label: "RAB.06 Sosial", value: 94 },
];
const affairs = [...rabList, "RAB.04 Pemerintahan", "RAB.06 Sosial", "RAB.09 Lainnya"].map((label, i) => ({ label, value: 64 - i * 5 }));
const opdTotals = opdList.map((name, i) => ({ name, total: 153 - i * 18 }));
const fmt = new Intl.NumberFormat("id-ID");

/** Dashboard publik Domain Proses Bisnis (beranda portal). */
export function BusinessProcessDashboard() {
  const [selected, setSelected] = useState<Service | null>(null);
  const maxSector = Math.max(...sectors.map((s) => s.value));

  return (
    <Reveal className="grid gap-5">
      <FilterBar filters={[{ label: "Status", options: ["AS-IS", "Upgrade", "Baru"] }, { label: "Sasaran", options: ["Tata kelola", "Layanan publik"] }, { label: "RAB Level 3", options: rabList }]} />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard tone="teal" label="Proses bisnis" value={1845} trend={[1620, 1688, 1702, 1770, 1845]} />
        <StatCard tone="orange" label="AS-IS" value={1513} hint="82% dari total" />
        <StatCard tone="yellow" label="Upgrade" value={143} hint="8% dari total" />
        <StatCard tone="amber" label="Baru" value={189} hint="10% dari total" />
      </section>

      <section className="grid gap-5 *:min-w-0 xl:grid-cols-[2fr_1fr]">
        <Card data-reveal>
          <CardHeader>
            <CardTitle className="section-title">Tren proses bisnis</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <BarChart labels={years} series={trend} stacked />
          </CardContent>
        </Card>
        <Card data-reveal>
          <CardHeader>
            <CardTitle className="section-title">Komposisi status</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <DoughnutChart labels={["AS-IS", "Upgrade", "Baru"]} data={[1513, 143, 189]} caption="proses bisnis" colors={["--brand-teal", "--brand-yellow", "--brand-orange"]} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 *:min-w-0 xl:grid-cols-[1fr_1.2fr_1fr]">
        <Card data-reveal>
          <CardHeader>
            <CardTitle className="section-title">RAB Level 1 (sektor)</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {sectors.map((s) => <HeatTile key={s.label} label={s.label} value={fmt.format(s.value)} intensity={Math.sqrt(s.value / maxSector)} />)}
          </CardContent>
        </Card>

        <Card data-reveal>
          <CardHeader>
            <CardTitle className="section-title">RAB Level 2 (urusan)</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-2">
            {affairs.map((a) => <HeatTile key={a.label} label={a.label} value={String(a.value)} intensity={a.value / 64} className="min-h-14" />)}
          </CardContent>
        </Card>

        <Card data-reveal>
          <CardHeader>
            <CardTitle className="section-title">Perangkat Daerah teratas</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {opdTotals.map((opd) => (
              <div key={opd.name} className="grid gap-1.5">
                <div className="flex items-baseline justify-between gap-3 text-xs">
                  <span className="truncate font-medium">{opd.name}</span>
                  <b className="tabular-nums">{opd.total}</b>
                </div>
                <Meter value={(opd.total / opdTotals[0]!.total) * 100} label={opd.name} />
              </div>
            ))}
            <p className="mt-1 flex justify-between border-t pt-3 text-xs font-semibold">
              Total Perangkat Daerah <span>30</span>
            </p>
          </CardContent>
        </Card>
      </section>

      <DataTable
        title="Katalog proses bisnis"
        rows={services}
        rowId={(s) => s.id}
        searchText={(s) => [s.processBusiness, s.opd, s.purpose, s.rab].join(" ")}
        searchPlaceholder="Cari proses bisnis atau OPD"
        onView={setSelected}
        minWidth={980}
        columns={[
          { header: "ID", className: "whitespace-nowrap", cell: (s) => <span className="font-medium text-muted-foreground">PRB-{s.id.slice(-3)}</span> },
          { header: "Status", cell: () => <StatusBadge status="Upgrade" /> },
          { header: "Proses bisnis", cell: (s) => <span className="font-semibold">{s.processBusiness}</span> },
          { header: "Perangkat Daerah", cell: (s) => s.opd },
          { header: "Tujuan strategis", cell: (s) => <span className="text-muted-foreground">{s.purpose}</span> },
          { header: "IKU", cell: () => "Indeks SPBE" },
          { header: "RAB", cell: (s) => <span className="text-muted-foreground">{s.rab}</span> },
        ]}
      />

      {selected && (
        <DetailDialog
          open
          onOpenChange={(open) => !open && setSelected(null)}
          eyebrow={`PRB-${selected.id.slice(-3)}`}
          title={selected.processBusiness}
          meta={
            <>
              <StatusBadge status="Upgrade" />
              <Badge variant="info">{selected.opd}</Badge>
            </>
          }
        >
          <DetailSection title="Uraian" tone="accent">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {selected.purpose}. Mencakup penyusunan, harmonisasi, pelaksanaan standar operasional, dan pemantauan layanan.
            </p>
          </DetailSection>
          <DetailSection title="Klasifikasi RAB">
            <div className="grid gap-2 sm:grid-cols-3">
              <DetailField label="Level 1" value="RAB.09 Pemerintahan Umum" />
              <DetailField label="Level 2" value={selected.rab} />
              <DetailField label="Level 3" value="Penataan SDM Aparatur" />
            </div>
          </DetailSection>
          <div className="grid gap-2 sm:grid-cols-2">
            <DetailField label="Tujuan strategis" value={selected.purpose} />
            <DetailField label="Indikator Kinerja Utama" value="Indeks Sistem Merit — Sangat Baik" />
          </div>
        </DetailDialog>
      )}
    </Reveal>
  );
}
