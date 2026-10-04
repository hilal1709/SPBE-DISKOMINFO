"use client";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Download04Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { EmptyState } from "@/components/blocks/empty-state";
import { HeatTile } from "@/components/blocks/heat-tile";
import { PageHeader } from "@/components/blocks/page-header";
import { StatCard } from "@/components/blocks/stat-card";
import { StatusBadge } from "@/components/blocks/status-badge";
import { Icon } from "@/components/icon";
import { Illustration, illustrationNames } from "@/components/illustrations/illustration";
import { Brand } from "@/components/layout/brand";
import { Loader } from "@/components/loader";
import { Meter } from "@/components/motion/meter";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";

const colors = [
  ["primary", "Aksi utama, item aktif, sorotan"],
  ["secondary", "Latar badge & sorotan lembut"],
  ["accent", "Permukaan bernuansa amber"],
  ["panel", "Sidebar CMS (navy)"],
  ["foreground", "Teks utama"],
  ["muted-foreground", "Teks pendukung"],
  ["muted", "Latar netral sekunder"],
  ["border", "Garis & pemisah"],
  ["success", "Disetujui, selesai"],
  ["warning", "Diajukan, menunggu"],
  ["destructive", "Ditolak, error"],
  ["background", "Latar halaman"],
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

  return (
    <div className="min-h-svh">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-md lg:px-8">
        <Brand title="Design System" subtitle="SPBE Gresik" />
        <Button asChild variant="outline" className="ml-auto"><Link href="/">Ke portal</Link></Button>
      </header>

      <Reveal className="mx-auto grid max-w-6xl gap-12 p-4 lg:p-8">
        <PageHeader
          eyebrow="Panduan visual"
          title="Design system SPBE Gresik"
          description="Komponen shadcn/ui, animasi GSAP, ikon Hugeicons, dan ilustrasi Lottie. Aturan lengkap ada di docs/design-system.md."
        />

        <Section id="warna" title="Warna" description="Selalu pakai token (bg-primary, text-muted-foreground, …), jangan hex langsung.">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {colors.map(([token, usage]) => (
              <div key={token} className="overflow-hidden rounded-xl border bg-card">
                <div className="h-16 border-b" style={{ background: `var(--${token})` }} />
                <div className="p-3">
                  <p className="font-mono text-xs font-semibold">{token}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{usage}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section id="tipografi" title="Tipografi" description="Plus Jakarta Sans. Hierarki dibentuk oleh ukuran & bobot, bukan warna.">
          <Card>
            <CardContent className="grid gap-3">
              <p className="eyebrow">Eyebrow · 11px semibold kapital</p>
              <p className="text-2xl font-bold tracking-tight">Judul halaman · 24px bold</p>
              <p className="section-title">Judul section · 14px semibold + aksen</p>
              <p className="text-3xl font-bold tabular-nums">1.845 · Angka statistik</p>
              <p className="text-sm text-muted-foreground">Teks pendukung · 14px muted-foreground</p>
            </CardContent>
          </Card>
        </Section>

        <Section id="tombol" title="Tombol" description="Satu aksi utama (default) per area. Prop loading menampilkan spinner dan menonaktifkan tombol.">
          <Card>
            <CardContent className="flex flex-wrap items-center gap-3">
              <Button>Utama</Button>
              <Button variant="outline">Sekunder</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Hapus</Button>
              <Button variant="outline"><Icon icon={Download04Icon} size={16} />Dengan ikon</Button>
              <Button loading={loading} onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 1500); }}>Coba loading</Button>
              <Button variant="outline" onClick={() => toast.success("Tersimpan", { description: "Contoh notifikasi sonner." })}>Tampilkan toast</Button>
            </CardContent>
          </Card>
        </Section>

        <Section id="status" title="Badge status" description="Gunakan <StatusBadge/> agar warna status konsisten di seluruh aplikasi.">
          <Card>
            <CardContent className="flex flex-wrap gap-2">
              {["approved", "submitted", "draft", "rejected", "Upgrade", "Berjalan"].map((s) => <StatusBadge key={s} status={s} />)}
              <Badge variant="outline">Outline</Badge>
            </CardContent>
          </Card>
        </Section>

        <Section id="form" title="Form" description="Field + FieldLabel + kontrol shadcn. Ikon di input hanya untuk fungsi (cari, tampilkan sandi).">
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

        <Section id="data" title="Data & statistik" description="StatCard (CountUp + spotlight), Meter, dan HeatTile. Tanpa ikon dekoratif.">
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard label="Jumlah layanan" value={1284} hint="Periode 2025–2029" highlight />
            <StatCard label="Disetujui" value={82} suffix="%" hint="Lolos verifikasi" />
            <Card>
              <CardHeader>
                <CardTitle>Meter</CardTitle>
                <CardDescription>Bar tumbuh saat terlihat</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                <Meter value={76} label="Contoh 76%" />
                <Meter value={42} label="Contoh 42%" />
              </CardContent>
            </Card>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[1, 0.7, 0.4, 0.1].map((v) => <HeatTile key={v} label={`Intensitas ${v}`} value={String(Math.round(v * 100))} intensity={v} />)}
          </div>
        </Section>

        <Section id="ilustrasi" title="Ilustrasi Lottie" description="Untuk keadaan kosong, sukses, error, 404, sambutan, dan loading. Sumber: scripts/lottie/build.mjs.">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {illustrationNames.map((name) => (
              <Card key={name} className="items-center gap-2">
                <div className={name === "login-hero" ? "w-full rounded-lg bg-panel" : "w-full"}>
                  <Illustration name={name} className="mx-auto w-full max-w-48" />
                </div>
                <p className="font-mono text-xs">{name}</p>
              </Card>
            ))}
          </div>
        </Section>

        <Section id="loading" title="Loading" description="Loader bermerek untuk route (loading.tsx), Skeleton untuk konten, Spinner di dalam tombol.">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="items-center justify-center"><Loader /></Card>
            <Card>
              <CardContent className="grid gap-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
            <Card className="items-center justify-center"><Spinner className="size-6 text-primary" /></Card>
          </div>
        </Section>

        <Section id="kosong" title="Empty state" description="Ilustrasi + judul + deskripsi + aksi. Ganti ikon besar dengan ini.">
          <Card>
            <EmptyState title="Belum ada usulan" description="Usulan layanan yang Anda buat akan tampil di sini.">
              <Button>Buat usulan</Button>
            </EmptyState>
          </Card>
        </Section>
      </Reveal>
    </div>
  );
}
