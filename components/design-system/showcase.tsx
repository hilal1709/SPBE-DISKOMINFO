"use client";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Download04Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { Banner } from "@/components/blocks/banner";
import { DetailDialog, DetailField } from "@/components/blocks/detail-dialog";
import { EmptyState } from "@/components/blocks/empty-state";
import { HeatTile } from "@/components/blocks/heat-tile";
import { PageHeader } from "@/components/blocks/page-header";
import { StatCard } from "@/components/blocks/stat-card";
import { StatusBadge } from "@/components/blocks/status-badge";
import { Logo, LogoMark } from "@/components/brand/logo";
import { BarChart, DoughnutChart } from "@/components/charts";
import { Icon } from "@/components/icon";
import { Illustration, illustrationNames } from "@/components/illustrations/illustration";
import { Loader } from "@/components/loader";
import { Meter } from "@/components/motion/meter";
import { Reveal } from "@/components/motion/reveal";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";

const brand = [
  ["brand-sky", "#BBDEF0", "Sidebar, permukaan lembut, info"],
  ["brand-teal", "#00A6A6", "Sukses, aksi sekunder, fokus"],
  ["brand-yellow", "#EFCA08", "Kartu statistik, seri grafik 1"],
  ["brand-amber", "#F49F0A", "Kartu statistik, aksen judul"],
  ["brand-orange", "#F08700", "Kartu statistik, peringatan kuat"],
  ["brand-charcoal", "#2D2D2F", "Teks, tombol utama, nav aktif"],
] as const;

const semantic = [
  ["background", "Latar halaman"],
  ["card", "Kartu"],
  ["sidebar", "Sidebar (tint biru muda)"],
  ["muted-foreground", "Teks pendukung"],
  ["link", "Tautan (teal gelap, AA)"],
  ["destructive", "Ditolak / error"],
] as const;

function Section({ id, title, description, children }: { id: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <section id={id} className="grid scroll-mt-24 gap-4" data-reveal>
      <div>
        <h2 className="section-title text-base">{title}</h2>
        <p className="mt-1 pl-3 text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

export function DesignSystemShowcase() {
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState(false);

  return (
    <div className="min-h-svh">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 bg-background/80 px-4 backdrop-blur-md lg:px-8">
        <Logo subtitle="Design system" />
        <Button asChild variant="outline" className="ml-auto rounded-full"><Link href="/">Ke portal</Link></Button>
      </header>

      <Reveal className="mx-auto grid max-w-6xl gap-12 p-4 lg:p-8">
        <PageHeader title="Design system SPBE Gresik" description="shadcn/ui · GSAP · Hugeicons · Lottie · Chart.js — aturan lengkap di docs/design-system.md." />

        <Section id="logo" title="Logo" description="Lima lapisan arsitektur membentuk G. Favicon: app/icon.svg, apple-icon: app/apple-icon.tsx.">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="items-center justify-center py-8"><Logo /></Card>
            <Card className="items-center justify-center bg-panel py-8"><Logo tone="dark" /></Card>
            <Card className="flex-row items-end justify-center gap-4 py-8">
              <LogoMark className="size-16" />
              <LogoMark className="size-10" />
              <LogoMark className="size-6" />
              <LogoMark className="size-4" />
            </Card>
          </div>
        </Section>

        <Section id="warna" title="Palet" description="Palet Diskominfo. Distribusi: ±60% netral, ±15% biru muda, ±10% charcoal, ±15% aksen hangat & teal.">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {brand.map(([token, hex, usage]) => (
              <div key={token} className="overflow-hidden rounded-2xl bg-card shadow-card ring-1 ring-border">
                <div className="h-20" style={{ background: `var(--${token})` }} />
                <div className="p-3">
                  <p className="font-mono text-xs font-semibold">{hex}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{usage}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {semantic.map(([token, usage]) => (
              <div key={token} className="flex items-center gap-3 rounded-xl bg-card p-2.5 ring-1 ring-border">
                <span className="size-8 shrink-0 rounded-lg ring-1 ring-border" style={{ background: `var(--${token})` }} />
                <span className="min-w-0 leading-tight">
                  <span className="block font-mono text-[11px] font-semibold">{token}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{usage}</span>
                </span>
              </div>
            ))}
          </div>
        </Section>

        <Section id="statistik" title="Kartu statistik" description="Blok warna solid (teal → oranye → kuning → amber), teks charcoal, CountUp, opsional sparkline.">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard tone="teal" label="Layanan" value={1284} trend={[980, 1040, 1120, 1210, 1284]} />
            <StatCard tone="orange" label="Disetujui" value={82} suffix="%" />
            <StatCard tone="yellow" label="Terintegrasi" value={64} suffix="%" />
            <StatCard tone="amber" label="OPD" value={30} />
          </div>
        </Section>

        <Section id="grafik" title="Grafik (Chart.js)" description="Import dari @/components/charts. Warna seri lewat token (--brand-teal, …), tooltip pil charcoal, animasi saat terlihat.">
          <div className="grid gap-4 *:min-w-0 lg:grid-cols-[2fr_1fr]">
            <Card>
              <CardHeader><CardTitle className="section-title">BarChart</CardTitle></CardHeader>
              <CardContent className="h-64">
                <BarChart
                  labels={["Jan", "Feb", "Mar", "Apr", "Mei", "Jun"]}
                  series={[
                    { label: "Baru", data: [12, 19, 14, 22, 18, 25], color: "--brand-yellow" },
                    { label: "Diperbarui", data: [8, 11, 9, 14, 12, 16], color: "--brand-amber" },
                    { label: "Selesai", data: [5, 7, 6, 9, 8, 11], color: "--brand-teal" },
                  ]}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="section-title">DoughnutChart</CardTitle></CardHeader>
              <CardContent className="h-64">
                <DoughnutChart labels={["Layanan", "Data", "Aplikasi", "Infrastruktur"]} data={[128, 96, 72, 46]} caption="komponen" colors={["--brand-teal", "--brand-yellow", "--brand-orange", "--brand-sky"]} />
              </CardContent>
            </Card>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {[0, 0.25, 0.5, 0.75, 1].map((v) => <HeatTile key={v} label={`Intensitas ${v}`} value={String(Math.round(v * 100))} intensity={v} />)}
          </div>
          <Card>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <Meter value={76} label="Contoh 76%" />
              <Meter value={42} label="Contoh 42%" indicatorClassName="bg-brand-teal" />
            </CardContent>
          </Card>
        </Section>

        <Section id="tombol" title="Tombol & badge" description="Satu aksi utama (charcoal) per area. Prop loading menampilkan spinner.">
          <Card>
            <CardContent className="flex flex-wrap items-center gap-3">
              <Button>Utama</Button>
              <Button variant="teal">Sekunder teal</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Hapus</Button>
              <Button variant="outline"><Icon icon={Download04Icon} size={16} />Export</Button>
              <Button loading={loading} onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 1500); }}>Coba loading</Button>
            </CardContent>
            <CardContent className="flex flex-wrap gap-2 border-t pt-4">
              {["approved", "submitted", "draft", "rejected", "Upgrade", "Berjalan"].map((s) => <StatusBadge key={s} status={s} />)}
              <Badge variant="info">Info</Badge>
            </CardContent>
          </Card>
        </Section>

        <Section id="banner" title="Banner & alert" description="Banner untuk pengumuman sebaris yang bisa ditutup; Alert untuk pesan di dalam form.">
          <Banner variant="info" label="Baru">Periode perencanaan 2025–2029 telah dibuka.</Banner>
          <Banner variant="warning" label="Demo">Login belum diwajibkan pada lingkungan ini.</Banner>
          <Banner variant="success" action={<Button size="sm" variant="ghost" className="rounded-full">Lihat</Button>}>12 usulan disetujui minggu ini.</Banner>
          <Alert variant="destructive"><AlertDescription>Email atau kata sandi tidak valid.</AlertDescription></Alert>
        </Section>

        <Section id="modal" title="Modal & toast" description="Overlay blur charcoal, header/footer sticky. Toast charcoal dengan ikon berwarna, toast.promise, dan aksi Urungkan.">
          <Card>
            <CardContent className="flex flex-wrap gap-3">
              <Button onClick={() => setDialog(true)}>Buka modal</Button>
              <Button variant="outline" onClick={() => toast.success("Usulan disetujui", { description: "Layanan Informasi Publik", action: { label: "Urungkan", onClick: () => toast.info("Keputusan dibatalkan") } })}>Toast + Urungkan</Button>
              <Button variant="outline" onClick={() => toast.promise(new Promise((r) => setTimeout(r, 1200)), { loading: "Menyimpan draf…", success: "Draf tersimpan", error: "Gagal" })}>toast.promise</Button>
              <Button variant="outline" onClick={() => toast.warning("Data belum lengkap", { description: "Lengkapi RAB Level 3." })}>Peringatan</Button>
              <Button variant="outline" onClick={() => toast.error("Gagal mengirim", { description: "Periksa koneksi Anda." })}>Error</Button>
            </CardContent>
          </Card>
          <DetailDialog open={dialog} onOpenChange={setDialog} eyebrow="LYN-001" title="Layanan Informasi Publik Terpadu" meta={<StatusBadge status="approved" />}>
            <div className="grid gap-2 sm:grid-cols-2">
              <DetailField label="Perangkat Daerah" value="Dinas Komunikasi dan Informatika" />
              <DetailField label="RAL" value="RAL.01 Layanan Publik" />
            </div>
          </DetailDialog>
        </Section>

        <Section id="form" title="Form" description="Field + FieldLabel + kontrol shadcn. Ikon di input hanya untuk fungsi.">
          <Card>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="ds-nama">Nama layanan</FieldLabel>
                <Input id="ds-nama" placeholder="Contoh: Layanan Informasi Publik" />
                <FieldDescription>Deskripsi bantuan singkat.</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="ds-cari">Pencarian</FieldLabel>
                <InputGroup>
                  <InputGroupAddon><Icon icon={Search01Icon} size={16} /></InputGroupAddon>
                  <InputGroupInput id="ds-cari" placeholder="Cari data" />
                </InputGroup>
              </Field>
            </CardContent>
          </Card>
        </Section>

        <Section id="ilustrasi" title="Ilustrasi Lottie" description="Untuk keadaan kosong, sukses, error, 404, sambutan, dan loading. Sumber: scripts/lottie/build.mjs.">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {illustrationNames.map((name) => (
              <Card key={name} className="items-center gap-2">
                <div className={name === "login-hero" ? "w-full rounded-lg bg-brand-sky" : "w-full"}>
                  <Illustration name={name} className="mx-auto w-full max-w-48" />
                </div>
                <p className="font-mono text-xs">{name}</p>
              </Card>
            ))}
          </div>
        </Section>

        <Section id="loading" title="Loading" description="Loader bermerek untuk route, Skeleton untuk konten, Spinner di dalam tombol.">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="items-center justify-center"><Loader /></Card>
            <Card>
              <CardContent className="grid gap-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
            <Card className="items-center justify-center"><Spinner className="size-6 text-brand-teal" /></Card>
          </div>
        </Section>

        <Section id="kosong" title="Empty state" description="Ilustrasi + judul + deskripsi + aksi, sebagai pengganti ikon besar.">
          <Card>
            <EmptyState title="Belum ada usulan" description="Usulan yang Anda buat akan tampil di sini.">
              <Button>Buat usulan</Button>
            </EmptyState>
          </Card>
        </Section>
      </Reveal>
    </div>
  );
}
