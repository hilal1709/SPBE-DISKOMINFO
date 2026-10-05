"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { AiMagicIcon, ArrowDown01Icon, Cancel01Icon, CheckmarkCircle02Icon, SentIcon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { listDependencyOptions, saveData, suggestData } from "@/app/cms/data/actions";
import { Banner } from "@/components/blocks/banner";
import { RefPicker, type RefLabels } from "@/components/blocks/ref-picker";
import { Segmented } from "@/components/blocks/segmented";
import { LinkPicker, type LinkOption } from "@/components/cms/link-picker";
import { DeepRabField, SuggestItem, flash } from "@/components/cms/probis-form";
import { ReviewBadge } from "@/components/cms/review-badge";
import { useRad } from "@/components/data/rad-context";
import { Icon } from "@/components/icon";
import { Illustration } from "@/components/illustrations/illustration";
import { MOTION_OK, gsap, useGSAP } from "@/components/motion/gsap";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { DataSuggestion } from "@/lib/ai/data-suggest";
import { jenisLabel, jenisOptions, securityFields, sifatLabel, sifatOptions, validitasOptions, type Jenis, type SecurityKey, type Sifat } from "@/lib/data/reference";
import type { DataInput } from "@/lib/data/schema";
import { pdByCode, perangkatDaerah, type PeriodOptions } from "@/lib/probis/reference";
import type { DataRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

type Text = Exclude<keyof DataInput, "probis" | "layanan" | "security" | "interoperabel">;
type Values = { [K in Text]-?: string } & { interoperabel: "" | "ya" | "tidak"; probis: string[]; layanan: string[]; security: Partial<Record<SecurityKey, string[]>> };

const radLabels: RefLabels = { ref: "RAD", l1: "data pokok", l2: "data tematik", l3: "topik" };
const interopOptions = [
  { value: "ya" as const, label: "Ya" },
  { value: "tidak" as const, label: "Tidak" },
];
/** Produsen selain Perangkat Daerah (mis. BPS, instansi vertikal). */
const OTHER = "__lain";

const fromRecord = (r: DataRecord | null, lockedOpd: string | null, activePeriod: string): Values => ({
  opd: r?.opdCode ?? lockedOpd ?? "",
  name: r?.name ?? "",
  period: r?.period || activePeriod,
  uraian: r?.uraian ?? "",
  tujuan: r?.tujuan ?? "",
  produsen: r?.produsen ?? "",
  output: r?.output ?? "",
  input: r?.input ?? "",
  sifat: r?.sifat ?? "",
  jenis: r?.jenis ?? "",
  validitas: r?.validitas ?? "",
  interoperabel: r ? (r.interoperabel ? "ya" : "tidak") : "",
  rad: r?.rad3 ?? r?.rad2 ?? "",
  radL4: r?.radL4 ?? "",
  radL5: r?.radL5 ?? "",
  probis: r?.probis.map((p) => p.id) ?? [],
  layanan: r?.layanan.map((l) => l.id) ?? [],
  security: (r?.security ?? {}) as Values["security"],
});

/** Form tambah/ubah data (kolom template analis "Domain Arsitektur Data dan Informasi") dengan asisten AI, pemilih RAD, dan dependensi. */
export function DataForm({ record, lockedOpd, periods: { periods, active } }: { record: DataRecord | null; lockedOpd: string | null; periods: PeriodOptions }) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<Values>(() => fromRecord(record, lockedOpd, active));
  const [errors, setErrors] = useState<Record<string, string>>({});
  /** Versi RAD mengikuti periode data. */
  const rad = useRad(values.period);
  const [saving, startSaving] = useTransition();
  const [savingMode, setSavingMode] = useState<"draft" | "submit" | null>(null);
  const [done, setDone] = useState<{ submitted: boolean } | null>(null);
  const [producerOther, setProducerOther] = useState(() => !!record?.produsen && !pdByCode.has(record.produsen));

  const [note, setNote] = useState("");
  const [thinking, startThinking] = useTransition();
  const [suggestion, setSuggestion] = useState<DataSuggestion | null>(null);
  const panel = useRef<HTMLDivElement>(null);

  // Pilihan dependensi mengikuti OPD wali + periode; nama entri tertaut disimpan agar chip tetap terbaca.
  const [options, setOptions] = useState<{ probis: LinkOption[]; layanan: LinkOption[]; loaded: boolean }>(() => ({
    probis: record?.probis.map((p) => ({ code: p.id, name: p.name })) ?? [],
    layanan: record?.layanan.map((l) => ({ code: l.id, name: l.name })) ?? [],
    loaded: false,
  }));
  const [loadingDeps, startDeps] = useTransition();
  useEffect(() => {
    if (!values.opd || !values.period) return;
    startDeps(async () => {
      const result = await listDependencyOptions(values.opd, values.period);
      if (result.ok)
        setOptions({
          probis: result.data.probis,
          layanan: result.data.layanan.map((l) => ({ code: l.code, name: l.name, hint: l.opd === values.opd ? undefined : pdByCode.get(l.opd)?.name })),
          loaded: true,
        });
    });
  }, [values.opd, values.period]);
  /** Probis adalah master (notulen): tanpa probis di periode ini, data belum bisa diajukan. */
  const noProbis = options.loaded && !loadingDeps && options.probis.length === 0;

  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };
  const field = (key: string) => form.current?.querySelector(`[data-field="${key}"]`) ?? null;
  const resetDeps = () => setValues((v) => ({ ...v, probis: [], layanan: [] }));

  useGSAP(
    () => {
      if (!suggestion) return;
      gsap.matchMedia().add(MOTION_OK, () => {
        gsap.from("[data-suggest]", { opacity: 0, y: 10, stagger: 0.07, duration: 0.4, ease: "power3.out" });
      });
    },
    { dependencies: [suggestion], scope: panel },
  );

  const askAi = () => {
    if (values.name.trim().length < 3) {
      setErrors((e) => ({ ...e, name: "Isi nama data dulu agar AI punya konteks" }));
      flash(field("name"));
      return;
    }
    startThinking(async () => {
      const request = suggestData({ name: values.name, opd: values.opd, note, period: values.period });
      toast.promise(request.then((r) => (r.ok ? r : Promise.reject(new Error(r.error)))), {
        loading: "AI sedang menyusun saran…",
        success: (r) => (r.data.source === "gemini" ? "Saran dari Gemini siap" : "Saran lokal siap"),
        error: (e: Error) => e.message,
      });
      const result = await request;
      if (result.ok) setSuggestion(result.data);
    });
  };

  const apply = <K extends keyof Values>(key: K, value: Values[K]) => {
    set(key, value);
    requestAnimationFrame(() => flash(field(key)));
  };
  const applyAll = () => {
    if (!suggestion) return;
    apply("uraian", suggestion.uraian);
    apply("tujuan", suggestion.tujuan);
    if (suggestion.rad[0]) apply("rad", suggestion.rad[0].code);
    apply("sifat", suggestion.sifat);
    apply("jenis", suggestion.jenis);
    apply("validitas", suggestion.validitas);
    if (suggestion.interoperabel !== null) apply("interoperabel", suggestion.interoperabel ? "ya" : "tidak");
    toast.success("Semua saran diterapkan", { description: "Periksa kembali sebelum menyimpan." });
  };

  const submit = (mode: "draft" | "submit") => {
    setSavingMode(mode);
    startSaving(async () => {
      const input = { ...values, interoperabel: values.interoperabel === "ya" ? true : values.interoperabel === "tidak" ? false : (undefined as unknown as boolean) } as DataInput;
      const result = await saveData(input, { id: record?.id, submit: mode === "submit" });
      if (!result.ok) {
        setErrors(result.fields ?? {});
        toast.error(result.error);
        const first = Object.keys(result.fields ?? {})[0];
        if (first) field(first)?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      setDone({ submitted: mode === "submit" });
    });
  };

  return (
    <Reveal className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
      <form ref={form} onSubmit={(e) => (e.preventDefault(), submit("draft"))} className="grid min-w-0 gap-5" noValidate>
        {record?.radReview && (
          <Banner variant="warning" label="Perlu pemetaan" dismissible={false}>
            Versi RAD periode {record.period} sudah berganti dan RAD data ini belum punya padanan. Pilih ulang RAD lalu simpan.
          </Banner>
        )}
        <Card data-reveal>
          <CardHeader>
            <CardTitle className="section-title">Identitas</CardTitle>
            <CardDescription>
              ID: <b className="tabular-nums">{record?.code ?? (values.rad ? `GSK-DAT ${values.rad.slice(4)}.xx (otomatis)` : "dibuat otomatis dari RAD")}</b>
              {record && <ReviewBadge status={record.status} />}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field data-field="name" data-invalid={!!errors.name || undefined} className="rounded-lg">
                <FieldLabel htmlFor="name">Nama data</FieldLabel>
                <Input id="name" value={values.name} onChange={(e) => set("name", e.target.value)} placeholder="mis. Data Penerima Bantuan Sosial" aria-invalid={!!errors.name || undefined} />
                <FieldError>{errors.name}</FieldError>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field data-field="opd" data-invalid={!!errors.opd || undefined}>
                  <FieldLabel htmlFor="opd">Penanggung jawab / wali data</FieldLabel>
                  <Select value={values.opd || undefined} onValueChange={(v) => (set("opd", v), resetDeps())} disabled={!!lockedOpd}>
                    <SelectTrigger id="opd" className="w-full" aria-invalid={!!errors.opd || undefined}>
                      <SelectValue placeholder="Pilih Perangkat Daerah" />
                    </SelectTrigger>
                    <SelectContent>
                      {perangkatDaerah.map((pd) => (
                        <SelectItem key={pd.code} value={pd.code}>{pd.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {lockedOpd && <FieldDescription>Terkunci sesuai OPD akun Anda.</FieldDescription>}
                  <FieldError>{errors.opd}</FieldError>
                </Field>
                <Field>
                  <FieldLabel htmlFor="period">Periode arsitektur</FieldLabel>
                  <Select value={values.period} onValueChange={(v) => (set("period", v), resetDeps())}>
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
              </div>

              <Field data-field="produsen" data-invalid={!!errors.produsen || undefined} className="rounded-lg">
                <FieldLabel htmlFor="produsen">
                  Penghasil / produsen data <span className="font-normal text-muted-foreground">(opsional)</span>
                </FieldLabel>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Select
                    value={producerOther ? OTHER : values.produsen || undefined}
                    onValueChange={(v) => {
                      setProducerOther(v === OTHER);
                      set("produsen", v === OTHER ? "" : v);
                    }}
                  >
                    <SelectTrigger id="produsen" className="w-full">
                      <SelectValue placeholder="Sama dengan wali data" />
                    </SelectTrigger>
                    <SelectContent>
                      {perangkatDaerah.map((pd) => (
                        <SelectItem key={pd.code} value={pd.code}>{pd.name}</SelectItem>
                      ))}
                      <SelectItem value={OTHER}>Instansi lain…</SelectItem>
                    </SelectContent>
                  </Select>
                  {producerOther && <Input value={values.produsen} onChange={(e) => set("produsen", e.target.value)} placeholder="mis. BPS Kabupaten Gresik" aria-label="Nama instansi produsen" />}
                </div>
              </Field>

              <Field data-field="uraian" data-invalid={!!errors.uraian || undefined} className="rounded-lg">
                <FieldLabel htmlFor="uraian">Uraian data</FieldLabel>
                <Textarea id="uraian" rows={3} value={values.uraian} onChange={(e) => set("uraian", e.target.value)} aria-invalid={!!errors.uraian || undefined} />
                <FieldError>{errors.uraian}</FieldError>
              </Field>
              <Field data-field="tujuan" data-invalid={!!errors.tujuan || undefined} className="rounded-lg">
                <FieldLabel htmlFor="tujuan">Tujuan data</FieldLabel>
                <Textarea id="tujuan" rows={2} value={values.tujuan} onChange={(e) => set("tujuan", e.target.value)} aria-invalid={!!errors.tujuan || undefined} />
                <FieldError>{errors.tujuan}</FieldError>
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card data-reveal>
          <CardHeader>
            <CardTitle className="section-title">Klasifikasi RAD</CardTitle>
            <CardDescription>Cukup pilih RAD Level 3; Level 1 dan 2 mengikuti kodenya.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field data-field="rad" data-invalid={!!errors.rad || undefined} className="rounded-lg">
                <FieldLabel htmlFor="rad">RAD Level 3</FieldLabel>
                <RefPicker
                  id="rad"
                  index={rad}
                  labels={radLabels}
                  leafL2
                  value={values.rad || null}
                  onChange={(code) => {
                    set("rad", code ?? "");
                    // L4/L5 terdaftar yang bukan turunan RAD baru dikosongkan.
                    if (rad.byCode.has(values.radL4) && rad.byCode.get(values.radL4)?.parent !== code) {
                      set("radL4", "");
                      set("radL5", "");
                    }
                  }}
                  invalid={!!errors.rad}
                />
                <FieldError>{errors.rad}</FieldError>
              </Field>
              <DeepRabField refLabel="RAD" rab={rad} level={4} parent={values.rad} value={values.radL4} error={errors.radL4} onChange={(v) => set("radL4", v)} />
            </FieldGroup>
          </CardContent>
        </Card>

        <Card data-reveal>
          <CardHeader>
            <CardTitle className="section-title">Karakteristik</CardTitle>
            <CardDescription>Data interoperabel dapat dibagipakaikan antarsistem.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field data-field="sifat" data-invalid={!!errors.sifat || undefined} className="rounded-lg">
                <FieldLabel>Sifat data</FieldLabel>
                <Segmented label="Sifat data" value={values.sifat as Sifat} onChange={(v) => set("sifat", v)} options={sifatOptions} />
                <FieldError>{errors.sifat}</FieldError>
              </Field>
              <Field data-field="jenis" data-invalid={!!errors.jenis || undefined} className="rounded-lg">
                <FieldLabel>Jenis data</FieldLabel>
                <Segmented label="Jenis data" value={values.jenis as Jenis} onChange={(v) => set("jenis", v)} options={jenisOptions} />
                <FieldError>{errors.jenis}</FieldError>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field data-field="validitas" data-invalid={!!errors.validitas || undefined} className="rounded-lg">
                  <FieldLabel htmlFor="validitas">Validitas (pemutakhiran)</FieldLabel>
                  <Select value={values.validitas || undefined} onValueChange={(v) => set("validitas", v)}>
                    <SelectTrigger id="validitas" className="w-full" aria-invalid={!!errors.validitas || undefined}>
                      <SelectValue placeholder="Pilih frekuensi" />
                    </SelectTrigger>
                    <SelectContent>
                      {validitasOptions.map((v) => (
                        <SelectItem key={v} value={v}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError>{errors.validitas}</FieldError>
                </Field>
                <Field data-field="interoperabel" data-invalid={!!errors.interoperabel || undefined} className="rounded-lg">
                  <FieldLabel>Interoperabilitas</FieldLabel>
                  <Segmented label="Interoperabilitas" value={values.interoperabel as "ya" | "tidak"} onChange={(v) => set("interoperabel", v)} options={interopOptions} />
                  <FieldError>{errors.interoperabel}</FieldError>
                </Field>
              </div>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card data-reveal>
          <CardHeader>
            <CardTitle className="section-title">Informasi terkait</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-field="output" className="rounded-lg">
                <FieldLabel htmlFor="output">Output</FieldLabel>
                <Textarea id="output" rows={3} value={values.output} onChange={(e) => set("output", e.target.value)} placeholder="Informasi yang dihasilkan dari data ini" />
              </Field>
              <Field data-field="input" className="rounded-lg">
                <FieldLabel htmlFor="input">Input</FieldLabel>
                <Textarea id="input" rows={3} value={values.input} onChange={(e) => set("input", e.target.value)} placeholder="Informasi yang dibutuhkan untuk menghasilkan data ini" />
              </Field>
            </div>
          </CardContent>
        </Card>

        <Card data-reveal>
          <CardHeader>
            <CardTitle className="section-title">Dependensi</CardTitle>
            <CardDescription>Proses bisnis {pdByCode.get(values.opd)?.name ?? "Perangkat Daerah"} dan layanan pada periode {values.period}.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              {noProbis && (
                <Banner
                  variant="warning"
                  label="Probis wajib"
                  dismissible={false}
                  action={
                    <Button asChild size="sm" variant="outline">
                      <Link href="/cms/proses-bisnis/baru">Tambah probis</Link>
                    </Button>
                  }
                >
                  Perangkat Daerah ini belum memiliki proses bisnis pada periode {values.period}. Data hanya dapat diajukan setelah proses bisnisnya terdaftar.
                </Banner>
              )}
              <Field data-field="probis" data-invalid={!!errors.probis || undefined} className="rounded-lg">
                <FieldLabel>← Proses bisnis penghasil</FieldLabel>
                <LinkPicker noun="proses bisnis" disabledText="Pilih wali data dulu" options={options.probis} values={values.probis} loading={loadingDeps} disabled={!values.opd || noProbis} onChange={(v) => set("probis", v)} />
                <FieldError>{errors.probis}</FieldError>
              </Field>
              <Field data-field="layanan" className="rounded-lg">
                <FieldLabel>
                  → Layanan pengguna <span className="font-normal text-muted-foreground">(opsional)</span>
                </FieldLabel>
                <LinkPicker noun="layanan" disabledText="Pilih wali data dulu" options={options.layanan} values={values.layanan} loading={loadingDeps} disabled={!values.opd} onChange={(v) => set("layanan", v)} />
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        <SecurityCard value={values.security} onChange={(v) => set("security", v)} />

        <div className="sticky bottom-3 z-20 flex flex-wrap items-center justify-end gap-2 rounded-2xl bg-card/90 p-3 shadow-raised backdrop-blur-md" data-reveal>
          <Button asChild variant="ghost" className="mr-auto">
            <Link href="/cms/data">Batal</Link>
          </Button>
          <Button type="button" variant="outline" loading={saving && savingMode === "draft"} disabled={saving} onClick={() => submit("draft")}>
            Simpan draf
          </Button>
          <Button type="button" loading={saving && savingMode === "submit"} disabled={saving || noProbis} onClick={() => submit("submit")}>
            {!(saving && savingMode === "submit") && <Icon icon={SentIcon} size={16} />}
            Ajukan verifikasi
          </Button>
        </div>
      </form>

      <Card ref={panel} data-reveal className="gap-4 xl:sticky xl:top-20">
        <CardHeader>
          <CardTitle className="section-title">Asisten AI</CardTitle>
          <CardDescription>Menyusun uraian dan tujuan, menyarankan RAD, sifat, jenis, dan validitas dari nama data.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Catatan tambahan (opsional), mis. diperbarui tiap bulan lewat aplikasi" aria-label="Catatan untuk AI" />
          <Button type="button" onClick={askAi} loading={thinking} className="group/ai">
            {!thinking && <Icon icon={AiMagicIcon} size={16} className="transition-transform duration-300 group-hover/ai:scale-125 group-hover/ai:rotate-12" />}
            Isi dengan AI
          </Button>

          {suggestion ? (
            <div className="grid gap-2.5">
              <div data-suggest className="flex items-center justify-between gap-2">
                <Badge variant={suggestion.source === "gemini" ? "info" : "muted"}>{suggestion.source === "gemini" ? "Gemini" : "Saran lokal"}</Badge>
                <Button type="button" size="sm" variant="outline" onClick={applyAll}>Pakai semua</Button>
              </div>
              <SuggestItem label="Uraian" text={suggestion.uraian} onApply={() => apply("uraian", suggestion.uraian)} />
              <SuggestItem label="Tujuan" text={suggestion.tujuan} onApply={() => apply("tujuan", suggestion.tujuan)} />
              <SuggestItem
                label="Karakteristik"
                text={[sifatLabel[suggestion.sifat], jenisLabel[suggestion.jenis], suggestion.validitas, suggestion.interoperabel === null ? null : suggestion.interoperabel ? "Interoperabel" : "Belum interoperabel"].filter(Boolean).join(" · ")}
                onApply={() => {
                  apply("sifat", suggestion.sifat);
                  apply("jenis", suggestion.jenis);
                  apply("validitas", suggestion.validitas);
                  if (suggestion.interoperabel !== null) apply("interoperabel", suggestion.interoperabel ? "ya" : "tidak");
                }}
              />
              <div data-suggest className="grid gap-1.5 rounded-xl bg-muted/60 p-3">
                <p className="eyebrow">RAD</p>
                {suggestion.rad.map((r) => (
                  <button
                    key={r.code}
                    type="button"
                    onClick={() => apply("rad", r.code)}
                    className={cn(
                      "grid gap-0.5 rounded-lg border bg-card px-3 py-2 text-left text-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-teal hover:shadow-card",
                      values.rad === r.code && "border-brand-teal bg-brand-teal/10",
                    )}
                  >
                    <span className="font-semibold">
                      <span className="mr-1 text-muted-foreground tabular-nums">{r.code}</span>
                      {rad.byCode.get(r.code)?.name}
                    </span>
                    <span className="text-muted-foreground">{r.reason}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <Illustration name="data-catalog" className="mx-auto w-48 opacity-90" />
          )}
        </CardContent>
      </Card>

      <Dialog open={!!done} onOpenChange={(open) => !open && router.push("/cms/data")}>
        <DialogContent className="text-center sm:max-w-sm">
          <Illustration name="success" loop={false} className="mx-auto w-32" />
          <DialogTitle>{done?.submitted ? "Data diajukan" : "Draf tersimpan"}</DialogTitle>
          <DialogDescription>{done?.submitted ? "Menunggu verifikasi Verifikator Data Diskominfo." : `${values.name} — ${pdByCode.get(values.opd)?.name ?? ""}`}</DialogDescription>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <Button variant="outline" onClick={() => (record ? router.push(`/cms/data/${record.id}`) : (setDone(null), setValues(fromRecord(null, lockedOpd, active)), setSuggestion(null)))}>
              {record ? "Tetap di sini" : "Tambah lagi"}
            </Button>
            <Button onClick={() => router.push("/cms/data")}>
              <Icon icon={CheckmarkCircle02Icon} size={16} />
              Lihat daftar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Reveal>
  );
}

/** Dependensi Keamanan SPBE (7 kolom template). Teks bebas sampai modul Keamanan tersedia; terlipat secara bawaan. */
function SecurityCard({ value, onChange }: { value: Values["security"]; onChange: (value: Values["security"]) => void }) {
  const filled = securityFields.reduce((n, f) => n + (value[f.key]?.length ?? 0), 0);
  const [open, setOpen] = useState(filled > 0);
  const body = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!open) return;
      gsap.matchMedia().add(MOTION_OK, () => {
        gsap.from("[data-sec]", { opacity: 0, y: 8, stagger: 0.04, duration: 0.3, ease: "power2.out" });
      });
    },
    { dependencies: [open], scope: body },
  );

  return (
    <Card data-reveal>
      <CardHeader>
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="group/sec flex w-full items-center justify-between gap-3 text-left">
          <span className="grid gap-1">
            <CardTitle className="section-title">Keamanan SPBE</CardTitle>
            <CardDescription>
              Opsional · {filled ? `${filled} isian` : "belum diisi"} · ditautkan saat modul Keamanan tersedia
            </CardDescription>
          </span>
          <Icon icon={ArrowDown01Icon} size={18} className={cn("shrink-0 text-muted-foreground transition-transform duration-300", open && "rotate-180")} />
        </button>
      </CardHeader>
      {open && (
        <CardContent ref={body} className="grid gap-4 sm:grid-cols-2">
          {securityFields.map((f) => (
            <TagField key={f.key} label={`← ${f.label}`} values={value[f.key] ?? []} onChange={(list) => onChange({ ...value, [f.key]: list })} />
          ))}
        </CardContent>
      )}
    </Card>
  );
}

/** Daftar isian teks: Enter untuk menambah, chip bisa dilepas. */
function TagField({ label, values, onChange }: { label: string; values: string[]; onChange: (values: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const text = draft.trim();
    if (text && !values.includes(text)) onChange([...values, text]);
    setDraft("");
  };
  return (
    <Field data-sec className="rounded-lg">
      <FieldLabel>{label}</FieldLabel>
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add();
          }
        }}
        onBlur={add}
        placeholder="Nama/ID kegiatan, lalu Enter"
        aria-label={label}
      />
      {values.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {values.map((v) => (
            <li key={v} className="inline-flex max-w-full items-center gap-1 rounded-full bg-brand-sky/40 py-0.5 pr-0.5 pl-2.5 text-xs">
              <span className="truncate">{v}</span>
              <Button type="button" variant="ghost" size="icon-xs" aria-label={`Hapus ${v}`} onClick={() => onChange(values.filter((x) => x !== v))} className="size-5 rounded-full">
                <Icon icon={Cancel01Icon} size={11} />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Field>
  );
}
