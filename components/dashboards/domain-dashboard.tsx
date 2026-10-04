"use client";
import { useState } from "react";
import { DataTable } from "@/components/blocks/data-table";
import { DetailDialog, DetailField } from "@/components/blocks/detail-dialog";
import { FilterBar } from "@/components/blocks/filter-bar";
import { StatCard } from "@/components/blocks/stat-card";
import { StatusBadge } from "@/components/blocks/status-badge";
import { BarChart, DoughnutChart } from "@/components/charts";
import { Reveal } from "@/components/motion/reveal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { opdList } from "@/lib/demo-data";

export type DomainKey = "layanan" | "data" | "aplikasi" | "domain-infrastruktur" | "aplikasi-usulan" | "peta-rencana" | "infrastruktur";

type DomainConfig = { title: string; metric: string; count: number; cols: string[]; rows: string[][] };

const cfg: Record<DomainKey, DomainConfig> = {
  layanan: { title: "Domain Layanan", metric: "Jumlah layanan", count: 1284, cols: ["ID", "Status", "Nama Layanan", "Perangkat Daerah", "Target", "RAL"], rows: [["LYN-001", "Disetujui", "Layanan Informasi Publik", "Diskominfo", "Masyarakat Gresik", "RAL.01"], ["LYN-002", "Disetujui", "PPDB Digital", "Dinas Pendidikan", "Calon Siswa", "RAL.01"]] },
  data: { title: "Domain Data", metric: "Set data", count: 426, cols: ["ID", "Status", "Nama Data", "Pemilik", "Klasifikasi", "Standar"], rows: [["DAT-001", "Disetujui", "Data Penduduk", "Disdukcapil", "Data Induk", "Satu Data"], ["DAT-002", "Disetujui", "Data Kesehatan", "Dinas Kesehatan", "Sektoral", "Satu Data"]] },
  aplikasi: { title: "Domain Aplikasi", metric: "Jumlah aplikasi", count: 312, cols: ["ID", "Status", "Nama Aplikasi", "OPD", "Fungsi", "Integrasi"], rows: [["APP-001", "Disetujui", "Gresik Satu Data", "Diskominfo", "Manajemen Data", "Terintegrasi"], ["APP-002", "Disetujui", "SIPD Pendidikan", "Dinas Pendidikan", "Pendidikan", "Terintegrasi"]] },
  "domain-infrastruktur": { title: "Domain Infrastruktur", metric: "Komponen infrastruktur", count: 164, cols: ["ID", "Status", "Komponen", "Lokasi", "Jenis", "Kapasitas"], rows: [["INF-001", "Disetujui", "Server Aplikasi", "Data Center", "Server", "64 Core"], ["INF-002", "Disetujui", "Jaringan OPD", "Kabupaten Gresik", "Jaringan", "10 Gbps"]] },
  "aplikasi-usulan": { title: "Aplikasi Usulan", metric: "Usulan disetujui", count: 27, cols: ["ID", "Status", "Usulan", "OPD", "Prioritas", "Target"], rows: [["USL-001", "Disetujui", "Sistem Pengaduan", "Diskominfo", "Tinggi", "2026"], ["USL-002", "Disetujui", "Monitoring Stunting", "Dinas Kesehatan", "Tinggi", "2026"]] },
  "peta-rencana": { title: "Peta Rencana", metric: "Program 2025–2029", count: 86, cols: ["ID", "Status", "Program", "Domain", "Tahun", "Capaian"], rows: [["PRN-001", "Disetujui", "Integrasi Layanan Digital", "Aplikasi", "2026", "Berjalan"], ["PRN-002", "Disetujui", "Penguatan Data Center", "Infrastruktur", "2027", "Belum Mulai"]] },
  infrastruktur: { title: "Infrastruktur Aset", metric: "Total aset", count: 572, cols: ["ID", "Status", "Aset", "Lokasi", "Kategori", "Kapasitas"], rows: [["AST-001", "Disetujui", "Rack Server", "Data Center", "Perangkat", "42U"], ["AST-002", "Disetujui", "UPS Data Center", "Data Center", "Kelistrikan", "80 KVA"]] },
};

const badgeColumns = new Set(["Status", "Integrasi", "Prioritas", "Capaian"]);

/** Dashboard publik untuk domain arsitektur selain Proses Bisnis. */
export function DomainDashboard({ domain }: { domain: DomainKey }) {
  const d = cfg[domain];
  const [row, setRow] = useState<string[] | null>(null);

  return (
    <Reveal className="grid gap-5">
      <FilterBar filters={[{ label: "Status", options: ["Disetujui", "Diajukan"] }, { label: "Perangkat Daerah", options: opdList }, { label: "Klasifikasi" }]} />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard tone="teal" label={d.metric} value={d.count} trend={[0.82, 0.86, 0.9, 0.95, 1].map((f) => Math.round(d.count * f))} />
        <StatCard tone="orange" label="Disetujui" value={82} suffix="%" />
        <StatCard tone="yellow" label="Terintegrasi" value={64} suffix="%" />
        <StatCard tone="amber" label="OPD terlibat" value={30} />
      </section>

      <section className="grid gap-5 *:min-w-0 lg:grid-cols-[1fr_2fr]">
        <Card data-reveal>
          <CardHeader>
            <CardTitle className="section-title">Sebaran klasifikasi</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <DoughnutChart labels={["Kelompok 1", "Kelompok 2", "Kelompok 3"]} data={[64, 42, 28]} caption="persen" colors={["--brand-teal", "--brand-amber", "--brand-sky"]} />
          </CardContent>
        </Card>
        <Card data-reveal>
          <CardHeader>
            <CardTitle className="section-title">Capaian per tahun</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <BarChart
              labels={["2025", "2026", "2027", "2028", "2029"]}
              series={[
                { label: "Disetujui", data: [64, 70, 76, 82, 88], color: "--brand-yellow" },
                { label: "Terintegrasi", data: [41, 48, 55, 64, 72], color: "--brand-teal" },
              ]}
            />
          </CardContent>
        </Card>
      </section>

      <DataTable
        title={`Katalog ${d.title}`}
        rows={d.rows}
        rowId={(r) => r[0]!}
        searchText={(r) => r.join(" ")}
        onView={setRow}
        columns={d.cols.map((header, i) => ({
          header,
          cell: (r: string[]) => (badgeColumns.has(header) ? <StatusBadge status={r[i]!} /> : i === 2 ? <span className="font-semibold">{r[i]}</span> : r[i]),
        }))}
      />

      {row && (
        <DetailDialog open onOpenChange={(open) => !open && setRow(null)} eyebrow={`Detail ${d.title}`} title={row[2]!} meta={<StatusBadge status={row[1]!} />}>
          <div className="grid gap-2 sm:grid-cols-2">
            {d.cols.map((label, i) => <DetailField key={label} label={label} value={row[i]} />)}
          </div>
        </DetailDialog>
      )}
    </Reveal>
  );
}
