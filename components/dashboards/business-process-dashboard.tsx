"use client";
import { useState } from "react";
import { DataTable } from "@/components/blocks/data-table";
import { DetailDialog, DetailField, DetailSection } from "@/components/blocks/detail-dialog";
import { FilterBar } from "@/components/blocks/filter-bar";
import { HeatTile } from "@/components/blocks/heat-tile";
import { StatCard } from "@/components/blocks/stat-card";
import { StatusBadge } from "@/components/blocks/status-badge";
import { Meter } from "@/components/motion/meter";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { opdList, rabList, services } from "@/lib/demo-data";
import type { Service } from "@/lib/types";

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
      <FilterBar filters={[{ label: "Status", options: ["AS-IS", "Upgrade", "New"] }, { label: "Sasaran", options: ["Tata kelola", "Layanan publik"] }, { label: "RAB Level 3", options: rabList }]} />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Jumlah proses bisnis" value={1845} hint="Seluruh OPD periode 2025–2029" highlight />
        <StatCard label="Probis AS-IS" value={1513} hint="Berjalan sesuai kondisi saat ini" />
        <StatCard label="Probis upgrade" value={143} hint="Perlu peningkatan" />
        <StatCard label="Probis baru" value={189} hint="Direncanakan dalam periode" />
      </section>

      <section className="grid gap-5 *:min-w-0 xl:grid-cols-[1.15fr_1.15fr_0.9fr]">
        <Card data-reveal>
          <CardHeader>
            <CardTitle className="section-title">Referensi Arsitektur Proses Bisnis</CardTitle>
            <CardDescription className="pl-3">Heat map RAB Level 1 (sektor)</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {sectors.map((s) => <HeatTile key={s.label} label={s.label} value={fmt.format(s.value)} intensity={Math.sqrt(s.value / maxSector)} />)}
          </CardContent>
        </Card>

        <Card data-reveal>
          <CardHeader>
            <CardTitle className="section-title">RAB Level 2 (urusan)</CardTitle>
            <CardDescription className="pl-3">Jumlah proses bisnis per urusan</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-4">
            {affairs.map((a) => <HeatTile key={a.label} label={a.label} value={String(a.value)} intensity={a.value / 64} className="min-h-16" />)}
          </CardContent>
        </Card>

        <Card data-reveal>
          <CardHeader>
            <CardTitle className="section-title">Perangkat Daerah teratas</CardTitle>
            <CardDescription className="pl-3">Pemilik proses bisnis terbanyak</CardDescription>
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
        title="Katalog Proses Bisnis Perangkat Daerah"
        description="Klik detail untuk melihat klasifikasi RAB dan indikator kinerja."
        rows={services}
        rowId={(s) => s.id}
        searchText={(s) => [s.processBusiness, s.opd, s.purpose, s.rab].join(" ")}
        searchPlaceholder="Cari proses bisnis atau perangkat daerah"
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
          eyebrow="Detail proses bisnis"
          title={selected.processBusiness}
          description="Informasi lengkap arsitektur proses bisnis Pemerintah Kabupaten Gresik."
          meta={
            <>
              <Badge variant="outline">Kode {selected.id}</Badge>
              <StatusBadge status="Upgrade" />
              <Badge variant="success">{selected.opd}</Badge>
              <Badge variant="muted">2025–2029</Badge>
            </>
          }
        >
          <DetailSection title="Uraian proses bisnis" tone="accent">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {selected.purpose}. Proses bisnis ini mencakup tahapan penyusunan, harmonisasi, pelaksanaan standar operasional, dan pemantauan layanan Pemerintah Kabupaten Gresik.
            </p>
          </DetailSection>
          <DetailSection title="Klasifikasi Referensi Arsitektur Bisnis (RAB)">
            <div className="grid gap-2 sm:grid-cols-3">
              <DetailField label="RAB Level 1" value="RAB.09 Pemerintahan Umum" />
              <DetailField label="RAB Level 2" value={selected.rab} />
              <DetailField label="RAB Level 3" value="Penataan SDM Aparatur" />
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
