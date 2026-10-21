"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { CheckmarkCircle02Icon, FloppyDiskIcon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { saveRencana } from "@/app/cms/peta-rencana/actions";
import { Segmented } from "@/components/blocks/segmented";
import { Icon } from "@/components/icon";
import { Illustration } from "@/components/illustrations/illustration";
import { MOTION_OK, gsap, useGSAP } from "@/components/motion/gsap";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { muatanConfig, muatanKeys, sourceLabel, statusConfig, statusKeys, type Muatan, type RencanaSource, type RencanaStatus } from "@/lib/peta-rencana/muatan";
import { yearsOf } from "@/lib/peta-rencana/query";
import { inisiatifBySasaran } from "@/lib/peta-rencana/sasaran";
import type { RencanaInput } from "@/lib/peta-rencana/schema";
import { ikuBySasaran, perangkatDaerah, sasaranStrategis, type PeriodOptions } from "@/lib/probis/reference";
import type { RencanaRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

type Values = {
  opd: string;
  period: string;
  year: string;
  sasaran: string;
  inisiatif: string;
  muatan: Muatan | "";
  program: string;
  name: string;
  target: string;
  jumlah: string;
  satuan: string;
  status: RencanaStatus;
  realisasi: string;
  evaluasi: string;
  source: RencanaSource;
  sourceRef: string;
};

const fromRecord = (r: RencanaRecord | null, active: string): Values => ({
  opd: r?.opdCode ?? "",
  period: r?.period || active,
  year: r ? String(r.year) : "",
  sasaran: r?.sasaran ?? "",
  inisiatif: r?.inisiatif ?? "",
  muatan: r?.muatan ?? "",
  program: r?.program ?? "",
  name: r?.name ?? "",
  target: r?.target ?? "",
  jumlah: r ? String(r.jumlah) : "1",
  satuan: r?.satuan ?? "Kegiatan",
  status: r?.status ?? "direncanakan",
  realisasi: r?.realisasi ?? "",
  evaluasi: r?.evaluasi ?? "",
  source: r?.source ?? "manual",
  sourceRef: r?.sourceRef ?? "",
});

/** Form kegiatan Peta Rencana: muatan → sasaran & inisiatif → kegiatan & target, lalu evaluasi & realisasi terpisah. */
export function RencanaForm({ record, periods: { periods, active } }: { record: RencanaRecord | null; periods: PeriodOptions }) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const picker = useRef<HTMLDivElement>(null);
  const [values, setValues] = useState<Values>(() => fromRecord(record, active));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, startSaving] = useTransition();
  const [done, setDone] = useState(false);
  const sasaranIndex = sasaranStrategis.indexOf(values.sasaran);
  const years = yearsOf(values.period);

  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  /** Pilih sasaran: inisiatif bawaan diisi bila masih kosong atau masih bawaan sasaran sebelumnya. */
  const pickSasaran = (sasaran: string) => {
    const i = sasaranStrategis.indexOf(sasaran);
    setValues((v) => ({ ...v, sasaran, inisiatif: !v.inisiatif || inisiatifBySasaran.includes(v.inisiatif) ? (inisiatifBySasaran[i] ?? v.inisiatif) : v.inisiatif }));
    setErrors((e) => ({ ...e, sasaran: "" }));
  };

  useGSAP(
    () => {
      gsap.matchMedia().add(MOTION_OK, () => {
        gsap.from("[data-muatan]", { opacity: 0, y: 10, stagger: 0.03, duration: 0.35, ease: "power2.out", clearProps: "all" });
      });
    },
    { scope: picker },
  );

  const submit = () => {
    startSaving(async () => {
      const result = await saveRencana({ ...values, muatan: values.muatan || undefined } as RencanaInput, { id: record?.id });
      if (!result.ok) {
        setErrors(result.fields ?? {});
        toast.error(result.error);
        const first = Object.keys(result.fields ?? {})[0];
        if (first) form.current?.querySelector(`[data-field="${first}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      setDone(true);
    });
  };

  const text = (key: "name" | "program" | "inisiatif" | "target", label: string, placeholder: string, description?: string) => (
    <Field data-field={key} data-invalid={!!errors[key] || undefined} className="rounded-lg">
      <FieldLabel htmlFor={key}>{label}</FieldLabel>
      <Input id={key} value={values[key]} onChange={(e) => set(key, e.target.value)} placeholder={placeholder} aria-invalid={!!errors[key] || undefined} />
      {description && <FieldDescription>{description}</FieldDescription>}
      <FieldError>{errors[key]}</FieldError>
    </Field>
  );

  return (
    <Reveal className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
      <form ref={form} onSubmit={(e) => (e.preventDefault(), submit())} className="grid min-w-0 gap-5" noValidate>
        <Card data-reveal>
          <CardHeader>
            <CardTitle as="h2" className="section-title">Muatan</CardTitle>
            <CardDescription>Fokus arsitektur yang dituju kegiatan.</CardDescription>
          </CardHeader>
          <CardContent>
            <div ref={picker} data-field="muatan" className={cn("grid grid-cols-2 gap-2 rounded-lg sm:grid-cols-4", errors.muatan && "ring-2 ring-destructive/40")}>
              {muatanKeys.map((k) => {
                const c = muatanConfig[k];
                const on = values.muatan === k;
                return (
                  <button
                    key={k}
                    type="button"
                    data-muatan
                    onClick={() => set("muatan", k)}
                    aria-pressed={on}
                    style={{ ["--tone" as string]: `var(${c.tone})` }}
                    className={cn(
                      "relative overflow-hidden rounded-xl border bg-card px-3 py-2.5 text-left text-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card",
                      "before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-(--tone) before:opacity-60",
                      on && "border-(--tone) bg-(--tone)/10 font-semibold before:opacity-100",
                    )}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
            {errors.muatan && <p className="mt-2 text-sm text-destructive">{errors.muatan}</p>}
          </CardContent>
        </Card>

        <Card data-reveal>
          <CardHeader>
            <CardTitle as="h2" className="section-title">Rincian</CardTitle>
            <CardDescription>
              ID: <b className="tabular-nums">{record?.code ?? (values.muatan ? `GSK-PRN ${muatanConfig[values.muatan].abbr}.xxx (otomatis)` : "otomatis")}</b>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field data-field="sasaran" data-invalid={!!errors.sasaran || undefined}>
                <FieldLabel htmlFor="sasaran">Sasaran strategis</FieldLabel>
                <Select value={values.sasaran || undefined} onValueChange={pickSasaran}>
                  <SelectTrigger id="sasaran" className="w-full [&>span]:truncate" aria-invalid={!!errors.sasaran || undefined}>
                    <SelectValue placeholder="Pilih sasaran" />
                  </SelectTrigger>
                  <SelectContent className="max-w-[min(42rem,90vw)]">
                    {[...sasaranStrategis, ...(values.sasaran && sasaranIndex < 0 ? [values.sasaran] : [])].map((s) => (
                      <SelectItem key={s} value={s} className="whitespace-normal">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {sasaranIndex >= 0 && <FieldDescription>IKU: {ikuBySasaran[sasaranIndex]}</FieldDescription>}
                <FieldError>{errors.sasaran}</FieldError>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                {text("inisiatif", "Inisiatif strategis", "mis. Sistem Layanan Pendidikan Terpadu")}
                {text("program", "Program", "mis. Integrasi Aplikasi pada Portal Layanan")}
              </div>
              {text("name", "Kegiatan", "mis. Integrasi Aplikasi SPMB SD dan SMP")}
              <div className="grid gap-4 sm:grid-cols-3">
                <Field data-field="opd" data-invalid={!!errors.opd || undefined} className="sm:col-span-3">
                  <FieldLabel htmlFor="opd">Perangkat daerah pelaksana</FieldLabel>
                  <Select value={values.opd || undefined} onValueChange={(v) => set("opd", v)}>
                    <SelectTrigger id="opd" className="w-full" aria-invalid={!!errors.opd || undefined}>
                      <SelectValue placeholder="Pilih Perangkat Daerah" />
                    </SelectTrigger>
                    <SelectContent>
                      {perangkatDaerah.map((pd) => (
                        <SelectItem key={pd.code} value={pd.code}>{pd.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError>{errors.opd}</FieldError>
                </Field>
                <Field>
                  <FieldLabel htmlFor="period">Periode</FieldLabel>
                  <Select value={values.period} onValueChange={(v) => setValues((s) => ({ ...s, period: v, year: yearsOf(v).includes(s.year) ? s.year : "" }))}>
                    <SelectTrigger id="period" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {periods.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                          {p === active && <span className="text-xs text-muted-foreground">(aktif)</span>}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field data-field="year" data-invalid={!!errors.year || undefined}>
                  <FieldLabel htmlFor="year">Tahun</FieldLabel>
                  <Select value={values.year || undefined} onValueChange={(v) => set("year", v)}>
                    <SelectTrigger id="year" className="w-full" aria-invalid={!!errors.year || undefined}>
                      <SelectValue placeholder="Pilih tahun" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((y) => (
                        <SelectItem key={y} value={y}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError>{errors.year}</FieldError>
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field data-field="jumlah" data-invalid={!!errors.jumlah || undefined}>
                    <FieldLabel htmlFor="jumlah">Jumlah</FieldLabel>
                    <Input id="jumlah" type="number" min={0} step="any" inputMode="decimal" value={values.jumlah} onChange={(e) => set("jumlah", e.target.value)} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="satuan">Satuan</FieldLabel>
                    <Input id="satuan" value={values.satuan} onChange={(e) => set("satuan", e.target.value)} />
                  </Field>
                </div>
              </div>
              {text("target", "Target", "mis. Aplikasi terintegrasi portal layanan")}
              {values.source !== "manual" && (
                <Field>
                  <FieldLabel htmlFor="sourceRef">Asal usulan</FieldLabel>
                  <Input id="sourceRef" value={values.sourceRef} onChange={(e) => set("sourceRef", e.target.value)} />
                  <FieldDescription>{sourceLabel[values.source]}</FieldDescription>
                </Field>
              )}
            </FieldGroup>
          </CardContent>
        </Card>

        <Card data-reveal>
          <CardHeader>
            <CardTitle as="h2" className="section-title">Evaluasi & realisasi</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Segmented label="Status pelaksanaan" value={values.status} onChange={(v) => set("status", v)} options={statusKeys.map((k) => ({ value: k, label: statusConfig[k].label }))} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field data-field="realisasi" data-invalid={!!errors.realisasi || undefined} className="rounded-lg">
                  <FieldLabel htmlFor="realisasi">Realisasi</FieldLabel>
                  <Textarea id="realisasi" rows={3} value={values.realisasi} onChange={(e) => set("realisasi", e.target.value)} placeholder="Capaian nyata terhadap target" aria-invalid={!!errors.realisasi || undefined} />
                  <FieldError>{errors.realisasi}</FieldError>
                </Field>
                <Field className="rounded-lg">
                  <FieldLabel htmlFor="evaluasi">Catatan evaluasi</FieldLabel>
                  <Textarea id="evaluasi" rows={3} value={values.evaluasi} onChange={(e) => set("evaluasi", e.target.value)} placeholder="Kendala, penyesuaian, atau tindak lanjut" />
                </Field>
              </div>
            </FieldGroup>
          </CardContent>
        </Card>

        <div className="sticky bottom-3 z-20 flex flex-wrap items-center justify-end gap-2 rounded-2xl bg-card/90 p-3 shadow-raised backdrop-blur-md" data-reveal>
          <Button asChild variant="ghost" className="mr-auto">
            <Link href="/cms/peta-rencana">Batal</Link>
          </Button>
          <Button type="submit" loading={saving}>
            {!saving && <Icon icon={FloppyDiskIcon} size={16} />}
            Simpan
          </Button>
        </div>
      </form>

      <Card data-reveal className="hidden gap-3 xl:sticky xl:top-20 xl:flex">
        <CardContent className="grid gap-3">
          <Illustration name="roadmap" className="mx-auto w-52" />
          <p className="text-sm text-muted-foreground">Kegiatan langsung tampil di portal setelah disimpan. Usulan yang belum ter-cover bisa dialihkan ke tahun berikutnya dari pop-up detail.</p>
        </CardContent>
      </Card>

      <Dialog open={done} onOpenChange={(open) => !open && router.push("/cms/peta-rencana")}>
        <DialogContent className="text-center sm:max-w-sm">
          <Illustration name="success" loop={false} className="mx-auto w-32" />
          <DialogTitle>Kegiatan tersimpan</DialogTitle>
          <DialogDescription>{values.name} · {values.year}</DialogDescription>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <Button variant="outline" onClick={() => (record ? setDone(false) : (setDone(false), setValues((v) => ({ ...fromRecord(null, active), period: v.period, sasaran: v.sasaran, inisiatif: v.inisiatif, muatan: v.muatan, program: v.program, opd: v.opd }))))}>
              {record ? "Tetap di sini" : "Tambah lagi"}
            </Button>
            <Button onClick={() => router.push("/cms/peta-rencana")}>
              <Icon icon={CheckmarkCircle02Icon} size={16} />
              Lihat daftar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Reveal>
  );
}
