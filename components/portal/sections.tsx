"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft01Icon, ArrowRight01Icon, Download04Icon } from "@hugeicons/core-free-icons";
import { DataTable } from "@/components/blocks/data-table";
import { DetailDialog, DetailField } from "@/components/blocks/detail-dialog";
import { EmptyState } from "@/components/blocks/empty-state";
import { PageHeader } from "@/components/blocks/page-header";
import { StatCard } from "@/components/blocks/stat-card";
import { StatusBadge, statusLabel } from "@/components/blocks/status-badge";
import { Icon } from "@/components/icon";
import { gsap, useGSAP } from "@/components/motion/gsap";
import { Reveal } from "@/components/motion/reveal";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { opdList, processList, rabList, ralList, services } from "@/lib/demo-data";
import { initials } from "@/lib/roles";
import type { Service } from "@/lib/types";
import { cn } from "@/lib/utils";

/* ---------- Katalog layanan ---------- */

export function ServiceCatalog() {
  const [selected, setSelected] = useState<Service | null>(null);
  return (
    <Reveal className="grid gap-5">
      <DataTable
        title="Layanan seluruh Perangkat Daerah"
        rows={services}
        rowId={(s) => s.id}
        searchText={(s) => [s.name, s.opd, s.rab].join(" ")}
        searchPlaceholder="Cari layanan atau OPD"
        onView={setSelected}
        actions={
          <Button asChild variant="outline">
            <a href="/api/export/layanan">
              <Icon icon={Download04Icon} size={16} />
              Export Excel
            </a>
          </Button>
        }
        columns={[
          { header: "ID", className: "whitespace-nowrap", cell: (s) => <span className="font-medium text-muted-foreground">{s.id}</span> },
          { header: "Status", cell: (s) => <StatusBadge status={s.status} /> },
          { header: "Layanan", cell: (s) => <span className="font-semibold">{s.name}</span> },
          { header: "Perangkat Daerah", cell: (s) => s.opd },
          { header: "RAL", cell: (s) => <span className="text-muted-foreground">{s.ral}</span> },
          { header: "RAB", cell: (s) => <span className="text-muted-foreground">{s.rab}</span> },
        ]}
      />
      {selected && (
        <DetailDialog open onOpenChange={(open) => !open && setSelected(null)} eyebrow={selected.id} title={selected.name} meta={<StatusBadge status={selected.status} />}>
          <div className="grid gap-2 sm:grid-cols-2">
            <DetailField label="Perangkat Daerah" value={selected.opd} />
            <DetailField label="Status" value={statusLabel[selected.status]} />
            <DetailField label="Tujuan" value={selected.purpose} />
            <DetailField label="Fungsi" value={selected.function} />
            <DetailField label="Proses bisnis" value={selected.processBusiness} />
            <DetailField label="Risiko" value={selected.risk} />
          </div>
        </DetailDialog>
      )}
    </Reveal>
  );
}

/* ---------- Formulir pengajuan layanan (bertahap) ---------- */

const steps = ["Identitas", "Referensi", "Dampak & risiko", "Tinjau"];

function SelectField({ label, options }: { label: string; options: string[] }) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <Select>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={`Pilih ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
        </SelectContent>
      </Select>
    </Field>
  );
}

function TextField({ label, placeholder }: { label: string; placeholder?: string }) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <Input placeholder={placeholder ?? `Masukkan ${label.toLowerCase()}`} />
    </Field>
  );
}

export function ServiceForm() {
  const [step, setStep] = useState(1);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const progress = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.to(progress.current, { scaleX: (step - 1) / (steps.length - 1), duration: 0.5, ease: "power3.inOut" });
  }, { dependencies: [step] });

  const save = () => {
    setSaving(true);
    const request = new Promise<void>((resolve) => setTimeout(resolve, 900));
    toast.promise(request, { loading: "Menyimpan draf…", success: "Draf layanan tersimpan", error: "Gagal menyimpan draf" });
    request.then(() => { setSaving(false); setSaved(true); });
  };

  if (saved) {
    return (
      <Card className="mx-auto max-w-xl py-10">
        <EmptyState illustration="success" title="Draf tersimpan" description="Lanjutkan pengisian atau ajukan untuk verifikasi dari CMS.">
          <Button variant="outline" onClick={() => { setSaved(false); setStep(1); }}>Buat usulan lain</Button>
          <Button asChild><Link href="/cms/layanan">Buka Layanan Saya</Link></Button>
        </EmptyState>
      </Card>
    );
  }

  return (
    <Reveal className="mx-auto grid max-w-4xl gap-5">
      <p className="text-sm text-muted-foreground" data-reveal>Lengkapi empat tahap berikut. Data tersimpan sebagai draf sampai diajukan.</p>
      <div data-reveal>
        <ol className="relative grid grid-cols-4 gap-2">
          <div aria-hidden className="absolute top-4 right-[12.5%] left-[12.5%] h-0.5 bg-border">
            <div ref={progress} className="h-full origin-left scale-x-0 bg-primary" />
          </div>
          {steps.map((label, i) => {
            const n = i + 1;
            return (
              <li key={label} className="relative flex flex-col items-center gap-2 text-center">
                <button
                  type="button"
                  onClick={() => setStep(n)}
                  aria-current={n === step ? "step" : undefined}
                  className={cn(
                    "grid size-8 place-items-center rounded-full border-2 text-xs font-bold transition-all duration-300 ease-(--ease-out)",
                    n < step && "border-primary bg-primary text-primary-foreground",
                    n === step && "scale-110 border-primary bg-card text-foreground shadow-[0_0_0_4px_color-mix(in_oklab,var(--brand-yellow)_55%,transparent)]",
                    n > step && "border-border bg-card text-muted-foreground",
                  )}
                >
                  {n}
                </button>
                <span className={cn("text-xs font-medium", n === step ? "text-foreground" : "text-muted-foreground")}>{label}</span>
              </li>
            );
          })}
        </ol>
      </div>

      <Card data-reveal>
        <CardHeader className="border-b">
          <CardTitle>{["Identitas layanan", "Referensi arsitektur", "Dampak dan risiko", "Tinjau sebelum menyimpan"][step - 1]}</CardTitle>
          <CardDescription>Tahap {step} dari {steps.length}</CardDescription>
        </CardHeader>
        <CardContent key={step} className="animate-in duration-300 fade-in slide-in-from-right-2">
          {step === 4 ? (
            <p className="text-sm leading-relaxed text-muted-foreground">Periksa kembali isian sebelumnya, lalu simpan sebagai draf.</p>
          ) : (
            <FieldGroup className="grid gap-4 md:grid-cols-2">
              {step === 1 && (
                <>
                  <TextField label="Nama layanan" placeholder="Contoh: Layanan Informasi Publik" />
                  <SelectField label="Perangkat Daerah" options={opdList} />
                </>
              )}
              {step === 2 && (
                <>
                  <SelectField label="RAL Level 1" options={ralList} />
                  <SelectField label="RAB Level 2" options={rabList} />
                  <SelectField label="Proses bisnis" options={processList} />
                </>
              )}
              {step === 3 && (
                <>
                  <TextField label="Potensi risiko" />
                  <TextField label="Mitigasi risiko" />
                  <TextField label="Metode layanan" />
                  <TextField label="Target layanan" />
                </>
              )}
            </FieldGroup>
          )}
        </CardContent>
        <CardFooter className="justify-between">
          <Button variant="outline" disabled={step === 1} onClick={() => setStep(step - 1)}>
            <Icon icon={ArrowLeft01Icon} size={16} />
            Kembali
          </Button>
          {step === steps.length ? (
            <Button loading={saving} onClick={save}>Simpan draf</Button>
          ) : (
            <Button className="group" onClick={() => setStep(step + 1)}>
              Lanjut
              <Icon icon={ArrowRight01Icon} size={16} className="transition-transform duration-300 group-hover:translate-x-0.5" />
            </Button>
          )}
        </CardFooter>
      </Card>
    </Reveal>
  );
}

/* ---------- Gap analysis ---------- */

const gaps = [
  { title: "Kelengkapan referensi", finding: "23 layanan belum memiliki proses bisnis yang disetujui.", priority: "Tinggi" },
  { title: "Kesesuaian RAL", finding: "11 layanan perlu penyesuaian klasifikasi RAL.", priority: "Sedang" },
  { title: "Kesiapan digital", finding: "8 layanan memerlukan dukungan aplikasi atau infrastruktur.", priority: "Sedang" },
];

export function GapAnalysis() {
  return (
    <Reveal className="grid gap-5">
      <div className="grid gap-4 lg:grid-cols-3">
        {gaps.map((gap) => (
          <Card key={gap.title} data-reveal>
            <CardHeader>
              <StatusBadge status={gap.priority} />
              <CardTitle className="mt-2">{gap.title}</CardTitle>
              <CardDescription>{gap.finding}</CardDescription>
            </CardHeader>
            <CardFooter className="mt-auto">
              <Button variant="ghost" className="group -ml-2 text-link" onClick={() => toast.success("Usulan peta rencana dibuat", { description: gap.title, action: { label: "Lihat", onClick: () => {} } })}>
                Buat usulan peta rencana
                <Icon icon={ArrowRight01Icon} size={16} className="transition-transform duration-300 group-hover:translate-x-0.5" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </Reveal>
  );
}

/* ---------- Verifikasi ---------- */

export function VerificationQueue() {
  const [queue, setQueue] = useState(() => services.filter((s) => s.status === "submitted" || s.status === "draft"));
  const list = useRef<HTMLDivElement>(null);
  const decide = (item: Service, approved: boolean) => {
    const el = list.current?.querySelector(`[data-id="${item.id}"]`);
    const done = () => {
      let index = 0;
      setQueue((q) => {
        index = q.findIndex((s) => s.id === item.id);
        return q.filter((s) => s.id !== item.id);
      });
      // Pola "undo pill": keputusan bisa dibatalkan selama toast tampil.
      toast[approved ? "success" : "info"](approved ? "Usulan disetujui" : "Usulan dikembalikan ke OPD", {
        description: item.name,
        action: {
          label: "Urungkan",
          onClick: () => setQueue((q) => (q.some((s) => s.id === item.id) ? q : [...q.slice(0, index), item, ...q.slice(index)])),
        },
      });
    };
    if (!el) return done();
    gsap.to(el, { opacity: 0, x: approved ? 24 : -24, height: 0, paddingTop: 0, paddingBottom: 0, marginTop: 0, duration: 0.4, ease: "power2.in", onComplete: done });
  };

  return (
    <Reveal className="grid gap-5">
      <PageHeader title={`${queue.length} usulan menunggu`} description="Setujui atau kembalikan dengan catatan evaluasi." />
      <Card data-reveal className="py-2">
        {queue.length ? (
          <div ref={list} className="divide-y">
            {queue.map((item) => (
              <div key={item.id} data-id={item.id} className="flex flex-wrap items-center gap-4 overflow-hidden px-5 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <b className="text-sm">{item.name}</b>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{item.opd} · {item.processBusiness}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => decide(item, false)}>Kembalikan</Button>
                  <Button onClick={() => decide(item, true)}>Setujui</Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState illustration="success" className="py-10" title="Antrean sudah bersih" description="Usulan baru akan muncul di sini." />
        )}
      </Card>
    </Reveal>
  );
}

/* ---------- Master data ---------- */

export function MasterData() {
  return (
    <Reveal className="grid gap-5">
      <div className="flex justify-end" data-reveal>
        <Button asChild variant="outline"><Link href="/cms/master">Kelola di CMS</Link></Button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard tone="teal" label="Referensi Arsitektur Layanan" value={ralList.length} />
        <StatCard tone="yellow" label="Referensi Arsitektur Bisnis" value={rabList.length} />
        <StatCard tone="amber" label="Proses bisnis baku" value={processList.length} />
      </div>
    </Reveal>
  );
}

/* ---------- Pengguna ---------- */

const users = [
  { name: "Admin Diskominfo", role: "Superadmin", email: "admin@gresikkab.go.id" },
];

export function UsersOverview() {
  return (
    <Reveal className="grid gap-5">
      <Card data-reveal className="py-2">
        {users.map((user) => (
          <div key={user.email} className="flex items-center gap-3 px-5 py-3">
            <Avatar className="size-10">
              <AvatarFallback className="bg-brand-sky font-semibold text-brand-charcoal">{initials(user.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
            <Badge variant="info" className="ml-auto">{user.role}</Badge>
          </div>
        ))}
      </Card>
    </Reveal>
  );
}
