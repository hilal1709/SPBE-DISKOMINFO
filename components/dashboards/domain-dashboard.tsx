"use client";
import { useState } from "react";
import { DataTable } from "@/components/blocks/data-table";
import { DetailDialog, DetailField } from "@/components/blocks/detail-dialog";
import { FilterBar } from "@/components/blocks/filter-bar";
import { HeatTile } from "@/components/blocks/heat-tile";
import { StatCard } from "@/components/blocks/stat-card";
import { StatusBadge } from "@/components/blocks/status-badge";
import { Meter } from "@/components/motion/meter";
import { Reveal } from "@/components/motion/reveal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
        <StatCard label={d.metric} value={d.count} hint="Periode 2025–2029" highlight />
        <StatCard label="Disetujui" value={82} suffix="%" hint="Lolos verifikasi" />
        <StatCard label="Terintegrasi" value={64} suffix="%" hint="Terhubung antar-OPD" />
        <StatCard label="OPD terlibat" value={30} hint="Perangkat Daerah" />
      </section>

      <section className="grid gap-5 *:min-w-0 lg:grid-cols-2">
        <Card data-reveal>
          <CardHeader>
            <CardTitle className="section-title">Sebaran {d.title}</CardTitle>
            <CardDescription className="pl-3">Proporsi per kelompok klasifikasi</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            {[64, 42, 28].map((n, i) => <HeatTile key={n} label={`Kelompok ${i + 1}`} value={`${n}%`} intensity={n / 64} className="min-h-24" />)}
          </CardContent>
        </Card>
        <Card data-reveal>
          <CardHeader>
            <CardTitle className="section-title">Ringkasan status</CardTitle>
            <CardDescription className="pl-3">Capaian indikator domain</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {[88, 76, 64].map((n, i) => (
              <div key={n} className="grid gap-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium">Indikator {i + 1}</span>
                  <b className="tabular-nums">{n}%</b>
                </div>
                <Meter value={n} label={`Indikator ${i + 1}`} />
              </div>
            ))}
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
