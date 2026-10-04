"use client";
import Link from "next/link";
import { Add01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { PageHeader } from "@/components/blocks/page-header";
import { StatCard } from "@/components/blocks/stat-card";
import { StatusBadge } from "@/components/blocks/status-badge";
import { BarChart } from "@/components/charts";
import { Icon } from "@/components/icon";
import { Meter } from "@/components/motion/meter";
import { Reveal } from "@/components/motion/reveal";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { services } from "@/lib/demo-data";
import { initials } from "@/lib/roles";

const progress = [
  { label: "Domain Proses Bisnis", value: 82 },
  { label: "Domain Layanan", value: 74 },
  { label: "Domain Data", value: 61 },
  { label: "Domain Aplikasi", value: 48 },
];

/** Beranda CMS: ringkasan pekerjaan, aktivitas terbaru, dan progres periode. */
export function CmsDashboard() {
  const submitted = services.filter((s) => s.status === "submitted").length;

  return (
    <Reveal className="grid gap-6">
      <PageHeader
        title="Selamat datang kembali"
        description="Pantau pengajuan dan kelengkapan arsitektur Anda."
        actions={
          <Button asChild size="lg" className="group">
            <Link href="/cms/layanan/baru">
              <Icon icon={Add01Icon} size={16} className="transition-transform duration-300 ease-(--ease-out) group-hover:rotate-90" />
              Tambah layanan
            </Link>
          </Button>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard tone="teal" label="Disetujui" value={12} trend={[4, 6, 7, 9, 12]} />
        <StatCard tone="orange" label="Perlu revisi" value={2} />
        <StatCard tone="yellow" label="Menunggu verifikasi" value={submitted} />
        <StatCard tone="amber" label="Draf" value={4} />
      </section>

      <section className="grid gap-5 *:min-w-0 xl:grid-cols-[1.5fr_1fr]">
        <Card data-reveal>
          <CardHeader>
            <CardTitle className="section-title">Aktivitas terbaru</CardTitle>
            <CardAction>
              <Button asChild variant="ghost" size="sm" className="group text-link">
                <Link href="/cms/layanan">
                  Lihat semua
                  <Icon icon={ArrowRight01Icon} size={14} className="transition-transform duration-300 group-hover:translate-x-0.5" />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="divide-y">
            {services.map((s) => (
              <div key={s.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <Avatar className="size-9">
                  <AvatarFallback className="bg-brand-sky text-xs font-semibold text-brand-charcoal">{initials(s.opd.replace(/^(Dinas|Badan)\s/, ""))}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{s.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{s.id} · diperbarui {s.updatedAt}</p>
                </div>
                <div className="ml-auto shrink-0">
                  <StatusBadge status={s.status} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card data-reveal>
          <CardHeader>
            <CardTitle className="section-title">Kelengkapan arsitektur</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {progress.map((p) => (
              <div key={p.label} className="grid gap-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium">{p.label}</span>
                  <b className="tabular-nums">{p.value}%</b>
                </div>
                <Meter value={p.value} label={p.label} />
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <Card data-reveal>
        <CardHeader>
          <CardTitle className="section-title">Pengajuan per bulan</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <BarChart
            labels={["Apr", "Mei", "Jun", "Jul", "Agu", "Sep"]}
            series={[
              { label: "Diajukan", data: [6, 9, 7, 11, 8, 12], color: "--brand-yellow" },
              { label: "Disetujui", data: [4, 7, 6, 9, 7, 10], color: "--brand-teal" },
              { label: "Dikembalikan", data: [1, 2, 1, 2, 1, 2], color: "--brand-orange" },
            ]}
          />
        </CardContent>
      </Card>
    </Reveal>
  );
}
