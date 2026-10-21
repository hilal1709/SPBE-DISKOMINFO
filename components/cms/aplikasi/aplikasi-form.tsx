"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { AiMagicIcon, ArrowDown01Icon, CheckmarkCircle02Icon, SentIcon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { listDependencyOptions, saveAplikasi, suggestAplikasi } from "@/app/cms/aplikasi/actions";
import { useRaa } from "@/components/aplikasi/raa-context";
import { Banner } from "@/components/blocks/banner";
import { RefPicker, type RefLabels } from "@/components/blocks/ref-picker";
import { Segmented } from "@/components/blocks/segmented";
import { LinkPicker, type LinkOption } from "@/components/cms/link-picker";
import { SuggestItem, flash } from "@/components/cms/probis-form";
import { ReviewBadge } from "@/components/cms/review-badge";
import { Icon } from "@/components/icon";
import { Illustration } from "@/components/illustrations/illustration";
import { SecurityLinks, securityCount } from "@/components/keamanan/security-links";
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
import type { AplikasiSuggestion } from "@/lib/ai/aplikasi-suggest";
import { basisLabel, basisOptions, infraFields, instansiPusat, kepemilikanLabel, kepemilikanOf, lisensiOptions, mesinOptions, type Basis, type Lisensi } from "@/lib/aplikasi/reference";
import { flowLines } from "@/lib/aplikasi/data-flow";
import type { AplikasiInput } from "@/lib/aplikasi/schema";
import type { SecurityKey } from "@/lib/data/reference";
import { pdByCode, perangkatDaerah, type PeriodOptions } from "@/lib/probis/reference";
import type { AplikasiRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

type Text = Exclude<keyof AplikasiInput, "probis" | "layanan" | "data" | "security">;
type Values = { [K in Text]-?: string } & { probis: string[]; layanan: string[]; data: string[]; security: Partial<Record<SecurityKey, string[]>> };

const raaLabels: RefLabels = { ref: "RAA", l1: "jenis aplikasi", l2: "kelompok", l3: "sub-kelompok" };
/** Pengembang selain Perangkat Daerah dan K/L terdaftar (penyedia/pihak ketiga). */
const OTHER = "__lain";

const fromRecord = (r: AplikasiRecord | null, lockedOpd: string | null, activePeriod: string): Values => ({
  opd: r?.opdCode ?? lockedOpd ?? "",
  name: r?.name ?? "",
  period: r?.period || activePeriod,
  uraian: r?.uraian ?? "",
  fungsi: r?.fungsi ?? "",
  luaran: r?.luaran ?? "",
  mesin: r?.mesin ?? "",
  basis: r?.basis ?? "",
  lisensi: r?.lisensi ?? "",
  bahasa: r?.bahasa ?? "",
  kerangka: r?.kerangka ?? "",
  pengembang: r?.pengembang ?? lockedOpd ?? "",
  raa: r?.raa3 ?? r?.raa2 ?? "",
  raaL4: r?.raaL4 ?? "",
  raaL5: r?.raaL5 ?? "",
  probis: r?.probis.map((p) => p.id) ?? [],
  layanan: r?.layanan.map((l) => l.id) ?? [],
  data: r?.data.map((d) => d.id) ?? [],
  inputData: r?.inputData ?? "",
  outputData: r?.outputData ?? "",
  supplier: r?.supplier ?? "",
  customer: r?.customer ?? "",
  cloud: r?.cloud ?? "",
  server: r?.server ?? "",
  splp: r?.splp ?? "",
  jip: r?.jip ?? "",
  security: (r?.security ?? {}) as Values["security"],
});

type InfraOption = { code: string; name: string; opd: string; jenis: string };
const NONE = "__tidak";
/** Isian lama yang tidak ada di daftar pilihan tetap tampil sebagai chip. */
const withLegacy = (list: readonly LinkOption[], current: string[]) => [...list, ...current.filter((v) => !list.some((o) => o.code === v)).map((v) => ({ code: v, name: v, hint: "teks lama" }))];
/** Supplier data: Perangkat Daerah atau instansi pusat (disimpan sebagai nama). */
const supplierOptions: LinkOption[] = [...perangkatDaerah.map((pd) => ({ code: pd.name, name: pd.name })), ...instansiPusat.map((k) => ({ code: k, name: k, hint: "instansi pusat" }))];

const isKnownDeveloper = (v: string) => !v || pdByCode.has(v) || instansiPusat.includes(v);
const hintOf = (opd: string, own: string) => (opd === own ? undefined : pdByCode.get(opd)?.name);

/** Form tambah/ubah aplikasi (kolom template analis "Domain Arsitektur Aplikasi") dengan asisten AI, pemilih RAA, dan dependensi. */
export function AplikasiForm({ record, lockedOpd, periods: { periods, active } }: { record: AplikasiRecord | null; lockedOpd: string | null; periods: PeriodOptions }) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<Values>(() => fromRecord(record, lockedOpd, active));
  const [errors, setErrors] = useState<Record<string, string>>({});
  /** Versi RAA mengikuti periode aplikasi. */
  const raa = useRaa(values.period);
  const [saving, startSaving] = useTransition();
  const [savingMode, setSavingMode] = useState<"draft" | "submit" | null>(null);
  const [done, setDone] = useState<{ submitted: boolean } | null>(null);
  const [developerOther, setDeveloperOther] = useState(() => !isKnownDeveloper(record?.pengembang ?? ""));

  const [note, setNote] = useState("");
  const [thinking, startThinking] = useTransition();
  const [suggestion, setSuggestion] = useState<AplikasiSuggestion | null>(null);
  const panel = useRef<HTMLDivElement>(null);

  // Pilihan dependensi mengikuti periode (lintas OPD, milik unit operasional di atas); nama entri tertaut disimpan agar chip tetap terbaca.
  const [options, setOptions] = useState<{ probis: LinkOption[]; layanan: LinkOption[]; data: LinkOption[]; infra: InfraOption[]; loaded: boolean }>(() => ({
    probis: record?.probis.map((p) => ({ code: p.id, name: p.name })) ?? [],
    layanan: record?.layanan.map((l) => ({ code: l.id, name: l.name })) ?? [],
    // Data tertaut + data yang dirujuk inputan/luaran, agar chip terbaca sebelum daftar dimuat.
    data: [...(record?.data.map((d) => ({ code: d.id, name: d.name })) ?? []), ...Object.entries(record?.dataNames ?? {}).map(([code, name]) => ({ code, name }))],
    infra: [],
    loaded: false,
  }));
  const [loadingDeps, startDeps] = useTransition();
  useEffect(() => {
    if (!values.period) return;
    startDeps(async () => {
      const result = await listDependencyOptions(values.opd, values.period);
      if (!result.ok) return;
      const map = (list: { code: string; name: string; opd: string }[]) => list.map((x) => ({ code: x.code, name: x.name, hint: hintOf(x.opd, values.opd) }));
      setOptions({ probis: map(result.data.probis), layanan: map(result.data.layanan), data: map(result.data.data), infra: result.data.infra, loaded: true });
    });
  }, [values.opd, values.period]);
  /** Notulen: aplikasi wajib selaras proses bisnis yang sudah disetujui. */
  const noProbis = options.loaded && !loadingDeps && options.probis.length === 0;
  const kepemilikan = values.pengembang ? kepemilikanOf(values.pengembang) : null;

  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };
  const field = (key: string) => form.current?.querySelector(`[data-field="${key}"]`) ?? null;

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
    if (values.name.trim().length < 2) {
      setErrors((e) => ({ ...e, name: "Isi nama aplikasi dulu agar AI punya konteks" }));
      flash(field("name"));
      return;
    }
    startThinking(async () => {
      const request = suggestAplikasi({ name: values.name, opd: values.opd, pengembang: values.pengembang || undefined, note, period: values.period });
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
  const merge = (key: "probis" | "layanan", codes: string[]) => apply(key, [...new Set([...values[key], ...codes])]);
  const applyAll = () => {
    if (!suggestion) return;
    apply("uraian", suggestion.uraian);
    apply("fungsi", suggestion.fungsi);
    apply("luaran", suggestion.luaran);
    if (suggestion.raa[0]) apply("raa", suggestion.raa[0].code);
    if (suggestion.basis) apply("basis", suggestion.basis);
    if (suggestion.customer) apply("customer", suggestion.customer);
    if (suggestion.probis.length) merge("probis", suggestion.probis.map((p) => p.code));
    if (suggestion.layanan.length) merge("layanan", suggestion.layanan.map((l) => l.code));
    toast.success("Semua saran diterapkan", { description: "Periksa kembali sebelum menyimpan." });
  };

  const submit = (mode: "draft" | "submit") => {
    setSavingMode(mode);
    startSaving(async () => {
      const result = await saveAplikasi(values as AplikasiInput, { id: record?.id, submit: mode === "submit" });
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

  const nameOf = (list: LinkOption[], code: string) => list.find((o) => o.code === code)?.name ?? code;

  return (
    <Reveal className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
      <form ref={form} onSubmit={(e) => (e.preventDefault(), submit("draft"))} className="grid min-w-0 gap-5" noValidate>
        {record?.raaReview && (
          <Banner variant="warning" label="Perlu pemetaan" dismissible={false}>
            Versi RAA periode {record.period} sudah berganti dan RAA aplikasi ini belum punya padanan. Pilih ulang RAA lalu simpan.
          </Banner>
        )}
        <Card data-reveal>
          <CardHeader>
            <CardTitle as="h2" className="section-title">Identitas</CardTitle>
            <CardDescription>
              ID: <b className="tabular-nums">{record?.code ?? (values.raa ? `GSK-APL ${values.raa.slice(4)}.xxx (otomatis)` : "dibuat otomatis dari RAA")}</b>
              {record && <ReviewBadge status={record.status} />}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field data-field="name" data-invalid={!!errors.name || undefined} className="rounded-lg">
                <FieldLabel htmlFor="name">Nama aplikasi</FieldLabel>
                <Input id="name" value={values.name} onChange={(e) => set("name", e.target.value)} placeholder="mis. Sistem Informasi Perizinan Online" aria-invalid={!!errors.name || undefined} />
                <FieldError>{errors.name}</FieldError>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field data-field="opd" data-invalid={!!errors.opd || undefined}>
                  <FieldLabel htmlFor="opd">Unit operasional teknologi</FieldLabel>
                  <Select value={values.opd || undefined} onValueChange={(v) => set("opd", v)} disabled={!!lockedOpd}>
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
                  <Select value={values.period} onValueChange={(v) => setValues((c) => ({ ...c, period: v, probis: [], layanan: [], data: [] }))}>
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

              <Field data-field="pengembang" data-invalid={!!errors.pengembang || undefined} className="rounded-lg">
                <FieldLabel htmlFor="pengembang">Unit pengembang</FieldLabel>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Select
                    value={developerOther ? OTHER : values.pengembang || undefined}
                    onValueChange={(v) => {
                      setDeveloperOther(v === OTHER);
                      set("pengembang", v === OTHER ? "" : v);
                    }}
                  >
                    <SelectTrigger id="pengembang" className="w-full" aria-invalid={!!errors.pengembang || undefined}>
                      <SelectValue placeholder="Pilih pengembang" />
                    </SelectTrigger>
                    <SelectContent>
                      {perangkatDaerah.map((pd) => (
                        <SelectItem key={pd.code} value={pd.code}>{pd.name}</SelectItem>
                      ))}
                      {instansiPusat.map((k) => (
                        <SelectItem key={k} value={k}>{k}</SelectItem>
                      ))}
                      <SelectItem value={OTHER}>Penyedia / pihak ketiga…</SelectItem>
                    </SelectContent>
                  </Select>
                  {developerOther && <Input value={values.pengembang} onChange={(e) => set("pengembang", e.target.value)} placeholder="mis. PT Mitra Teknologi Nusantara" aria-label="Nama penyedia" />}
                </div>
                {kepemilikan && (
                  <FieldDescription>
                    Kepemilikan: <b>{kepemilikanLabel[kepemilikan]}</b> (mengikuti unit pengembang)
                  </FieldDescription>
                )}
                <FieldError>{errors.pengembang}</FieldError>
              </Field>

              <Field data-field="uraian" data-invalid={!!errors.uraian || undefined} className="rounded-lg">
                <FieldLabel htmlFor="uraian">Uraian aplikasi</FieldLabel>
                <Textarea id="uraian" rows={2} value={values.uraian} onChange={(e) => set("uraian", e.target.value)} placeholder="Definisi singkat aplikasi" aria-invalid={!!errors.uraian || undefined} />
                <FieldError>{errors.uraian}</FieldError>
              </Field>
              <Field data-field="fungsi" data-invalid={!!errors.fungsi || undefined} className="rounded-lg">
                <FieldLabel htmlFor="fungsi">Fungsi aplikasi</FieldLabel>
                <Textarea id="fungsi" rows={3} value={values.fungsi} onChange={(e) => set("fungsi", e.target.value)} placeholder="Fungsi-fungsi utama" aria-invalid={!!errors.fungsi || undefined} />
                <FieldError>{errors.fungsi}</FieldError>
              </Field>
              <Field data-field="luaran" data-invalid={!!errors.luaran || undefined} className="rounded-lg">
                <FieldLabel htmlFor="luaran">Luaran</FieldLabel>
                <Input id="luaran" value={values.luaran} onChange={(e) => set("luaran", e.target.value)} placeholder="Hasil yang diperoleh dari aplikasi" aria-invalid={!!errors.luaran || undefined} />
                <FieldError>{errors.luaran}</FieldError>
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card data-reveal>
          <CardHeader>
            <CardTitle as="h2" className="section-title">Klasifikasi RAA</CardTitle>
            <CardDescription>Aplikasi Umum dipakai lintas instansi; Aplikasi Khusus spesifik urusan.</CardDescription>
          </CardHeader>
          <CardContent>
            <Field data-field="raa" data-invalid={!!errors.raa || undefined} className="rounded-lg">
              <FieldLabel htmlFor="raa">RAA</FieldLabel>
              <RefPicker id="raa" index={raa} labels={raaLabels} leafL2 value={values.raa || null} onChange={(code) => set("raa", code ?? "")} invalid={!!errors.raa} />
              <FieldError>{errors.raa}</FieldError>
            </Field>
          </CardContent>
        </Card>

        <Card data-reveal>
          <CardHeader>
            <CardTitle as="h2" className="section-title">Teknologi</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field data-field="basis" data-invalid={!!errors.basis || undefined} className="rounded-lg">
                <FieldLabel>Basis aplikasi</FieldLabel>
                <Segmented label="Basis aplikasi" value={values.basis as Basis} onChange={(v) => set("basis", v)} options={basisOptions} />
                <FieldError>{errors.basis}</FieldError>
              </Field>
              <Field data-field="lisensi" data-invalid={!!errors.lisensi || undefined} className="rounded-lg">
                <FieldLabel>Tipe lisensi</FieldLabel>
                <Segmented label="Tipe lisensi" value={values.lisensi as Lisensi} onChange={(v) => set("lisensi", v)} options={lisensiOptions} />
                <FieldError>{errors.lisensi}</FieldError>
              </Field>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field data-field="bahasa" data-invalid={!!errors.bahasa || undefined} className="rounded-lg">
                  <FieldLabel htmlFor="bahasa">Bahasa pemrograman</FieldLabel>
                  <Input id="bahasa" value={values.bahasa} onChange={(e) => set("bahasa", e.target.value)} placeholder="mis. PHP" aria-invalid={!!errors.bahasa || undefined} />
                  <FieldError>{errors.bahasa}</FieldError>
                </Field>
                <Field data-field="kerangka" className="rounded-lg">
                  <FieldLabel htmlFor="kerangka">
                    Kerangka <span className="font-normal text-muted-foreground">(opsional)</span>
                  </FieldLabel>
                  <Input id="kerangka" value={values.kerangka} onChange={(e) => set("kerangka", e.target.value)} placeholder="mis. Laravel" />
                </Field>
                <Field data-field="mesin" className="rounded-lg">
                  <FieldLabel htmlFor="mesin">
                    Mesin basis data <span className="font-normal text-muted-foreground">(opsional)</span>
                  </FieldLabel>
                  <Input id="mesin" list="mesin-options" value={values.mesin} onChange={(e) => set("mesin", e.target.value)} placeholder="mis. PostgreSQL" />
                  <datalist id="mesin-options">
                    {mesinOptions.map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </Field>
              </div>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card data-reveal>
          <CardHeader>
            <CardTitle as="h2" className="section-title">Dependensi</CardTitle>
            <CardDescription>Proses bisnis tervalidasi, layanan, dan data pada periode {values.period}.</CardDescription>
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
                      <Link href="/cms/proses-bisnis">Lihat probis</Link>
                    </Button>
                  }
                >
                  Belum ada proses bisnis tervalidasi pada periode {values.period}. Aplikasi hanya dapat disimpan bila selaras dengan proses bisnis yang disetujui.
                </Banner>
              )}
              <Field data-field="probis" data-invalid={!!errors.probis || undefined} className="rounded-lg">
                <FieldLabel>← Proses bisnis terkait</FieldLabel>
                <LinkPicker noun="proses bisnis" disabledText="Belum ada probis tervalidasi" options={options.probis} values={values.probis} loading={loadingDeps} disabled={noProbis} onChange={(v) => set("probis", v)} />
                <FieldDescription>Hanya proses bisnis yang sudah tervalidasi Diskominfo.</FieldDescription>
                <FieldError>{errors.probis}</FieldError>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field data-field="layanan" className="rounded-lg">
                  <FieldLabel>
                    → Layanan didukung <span className="font-normal text-muted-foreground">(opsional)</span>
                  </FieldLabel>
                  <LinkPicker noun="layanan" disabledText="Pilih periode dulu" options={options.layanan} values={values.layanan} loading={loadingDeps} disabled={false} onChange={(v) => set("layanan", v)} />
                </Field>
                <Field data-field="data" className="rounded-lg">
                  <FieldLabel>
                    → Data digunakan <span className="font-normal text-muted-foreground">(opsional)</span>
                  </FieldLabel>
                  <LinkPicker noun="data" disabledText="Pilih periode dulu" options={options.data} values={values.data} loading={loadingDeps} disabled={false} onChange={(v) => set("data", v)} />
                </Field>
              </div>
            </FieldGroup>
          </CardContent>
        </Card>

        <Collapsible title="Aliran data" hint="Inputan & luaran dari modul Data, supplier dari instansi" filled={[values.inputData, values.supplier, values.outputData, values.customer].filter(Boolean).length}>
          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                ["inputData", "← Inputan data", "data", options.data],
                ["supplier", "→ Supplier data", "instansi", supplierOptions],
                ["outputData", "→ Luaran data", "data", options.data],
              ] as const
            ).map(([key, label, noun, list]) => (
              <Field key={key} data-field={key} data-sec className="rounded-lg">
                <FieldLabel>{label}</FieldLabel>
                <LinkPicker
                  noun={noun}
                  disabledText="Pilih periode dulu"
                  options={withLegacy(list, flowLines(values[key]))}
                  values={flowLines(values[key])}
                  loading={noun === "data" && loadingDeps}
                  disabled={false}
                  onChange={(v) => set(key, v.join("\n"))}
                />
              </Field>
            ))}
            <Field data-field="customer" data-sec className="rounded-lg">
              <FieldLabel htmlFor="customer">→ Customer data</FieldLabel>
              <Textarea id="customer" rows={2} value={values.customer} onChange={(e) => set("customer", e.target.value)} placeholder="mis. Masyarakat, ASN" />
            </Field>
          </div>
        </Collapsible>

        <Collapsible title="Infrastruktur" hint={`komponen Infrastruktur periode ${values.period}`} filled={infraFields.filter((f) => values[f.key]).length}>
          <div className="grid gap-4 sm:grid-cols-2">
            {infraFields.map((f) => {
              // Server boleh menunjuk perangkat keras server atau fasilitas komputasi tempat aplikasi berjalan.
              const kinds: string[] = f.key === "server" ? ["server", "fasilitas"] : [f.key];
              const list = options.infra.filter((o) => kinds.includes(o.jenis));
              const value = values[f.key];
              return (
                <Field key={f.key} data-field={f.key} data-sec className="rounded-lg">
                  <FieldLabel htmlFor={f.key}>→ {f.label}</FieldLabel>
                  <Select value={value || NONE} onValueChange={(v) => set(f.key, v === NONE ? "" : v)}>
                    <SelectTrigger id={f.key} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Tidak memakai</SelectItem>
                      {list.map((o) => (
                        <SelectItem key={o.code} value={o.name}>
                          {o.name}
                          {kinds.length > 1 && <span className="text-xs text-muted-foreground">({o.jenis === "fasilitas" ? "fasilitas" : "server"})</span>}
                        </SelectItem>
                      ))}
                      {value && !list.some((o) => o.name === value) && (
                        <SelectItem value={value}>
                          {value} <span className="text-xs text-muted-foreground">(teks lama)</span>
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {options.loaded && !list.length && <FieldDescription>Belum ada komponen {f.label.toLowerCase()} di periode ini.</FieldDescription>}
                </Field>
              );
            })}
          </div>
        </Collapsible>

        <Collapsible title="Keamanan SPBE" hint={`kegiatan keamanan tervalidasi periode ${values.period}`} filled={securityCount(values.security)}>
          <SecurityLinks period={values.period} value={values.security} onChange={(v) => set("security", v)} />
        </Collapsible>

        <div className="sticky bottom-3 z-20 flex flex-wrap items-center justify-end gap-2 rounded-2xl bg-card/90 p-3 shadow-raised backdrop-blur-md" data-reveal>
          <Button asChild variant="ghost" className="mr-auto">
            <Link href="/cms/aplikasi">Batal</Link>
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
          <CardTitle as="h2" className="section-title">Asisten AI</CardTitle>
          <CardDescription>Menyusun uraian, fungsi, dan luaran, menyarankan RAA serta proses bisnis yang selaras dari nama aplikasi.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Catatan tambahan (opsional), mis. dipakai masyarakat untuk mengajukan izin" aria-label="Catatan untuk AI" />
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
              <SuggestItem label="Fungsi" text={suggestion.fungsi} onApply={() => apply("fungsi", suggestion.fungsi)} />
              <SuggestItem label="Luaran" text={suggestion.luaran} onApply={() => apply("luaran", suggestion.luaran)} />
              {(suggestion.basis || suggestion.customer) && (
                <SuggestItem
                  label="Basis · customer"
                  text={[suggestion.basis && basisLabel[suggestion.basis], suggestion.customer].filter(Boolean).join(" · ")}
                  onApply={() => {
                    if (suggestion.basis) apply("basis", suggestion.basis);
                    if (suggestion.customer) apply("customer", suggestion.customer);
                  }}
                />
              )}
              <PickList label="RAA" items={suggestion.raa} active={(c) => values.raa === c} name={(c) => raa.byCode.get(c)?.name ?? c} onPick={(c) => apply("raa", c)} />
              {suggestion.probis.length > 0 && (
                <PickList label="Proses bisnis selaras" items={suggestion.probis} active={(c) => values.probis.includes(c)} name={(c) => nameOf(options.probis, c)} onPick={(c) => merge("probis", [c])} />
              )}
              {suggestion.layanan.length > 0 && (
                <PickList label="Layanan didukung" items={suggestion.layanan} active={(c) => values.layanan.includes(c)} name={(c) => nameOf(options.layanan, c)} onPick={(c) => merge("layanan", [c])} />
              )}
            </div>
          ) : (
            <Illustration name="app-ecosystem" className="mx-auto w-48 opacity-90" />
          )}
        </CardContent>
      </Card>

      <Dialog open={!!done} onOpenChange={(open) => !open && router.push("/cms/aplikasi")}>
        <DialogContent className="text-center sm:max-w-sm">
          <Illustration name="success" loop={false} className="mx-auto w-32" />
          <DialogTitle>{done?.submitted ? "Aplikasi diajukan" : "Draf tersimpan"}</DialogTitle>
          <DialogDescription>{done?.submitted ? "Menunggu verifikasi Verifikator Aplikasi Diskominfo." : `${values.name} — ${pdByCode.get(values.opd)?.name ?? ""}`}</DialogDescription>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <Button variant="outline" onClick={() => (record ? router.push(`/cms/aplikasi/${record.id}`) : (setDone(null), setValues(fromRecord(null, lockedOpd, active)), setSuggestion(null)))}>
              {record ? "Tetap di sini" : "Tambah lagi"}
            </Button>
            <Button onClick={() => router.push("/cms/aplikasi")}>
              <Icon icon={CheckmarkCircle02Icon} size={16} />
              Lihat daftar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Reveal>
  );
}

/** Daftar saran kode yang bisa diklik (RAA, probis, layanan). */
export function PickList({ label, items, active, name, onPick }: { label: string; items: { code: string; reason: string }[]; active: (code: string) => boolean; name: (code: string) => string; onPick: (code: string) => void }) {
  return (
    <div data-suggest className="grid gap-1.5 rounded-xl bg-muted/60 p-3">
      <p className="eyebrow">{label}</p>
      {items.map((r) => (
        <button
          key={r.code}
          type="button"
          onClick={() => onPick(r.code)}
          className={cn(
            "grid gap-0.5 rounded-lg border bg-card px-3 py-2 text-left text-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-teal hover:shadow-card",
            active(r.code) && "border-brand-teal bg-brand-teal/10",
          )}
        >
          <span className="font-semibold">
            <span className="mr-1 text-muted-foreground tabular-nums">{r.code}</span>
            {name(r.code)}
          </span>
          <span className="text-muted-foreground">{r.reason}</span>
        </button>
      ))}
    </div>
  );
}

/** Kartu opsional yang terlipat secara bawaan (terbuka bila sudah berisi). */
export function Collapsible({ title, hint, filled, children }: { title: string; hint: string; filled: number; children: React.ReactNode }) {
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
            <CardTitle as="h2" className="section-title">{title}</CardTitle>
            <CardDescription>
              Opsional · {filled ? `${filled} isian` : "belum diisi"} · {hint}
            </CardDescription>
          </span>
          <Icon icon={ArrowDown01Icon} size={18} className={cn("shrink-0 text-muted-foreground transition-transform duration-300", open && "rotate-180")} />
        </button>
      </CardHeader>
      {open && <CardContent ref={body}>{children}</CardContent>}
    </Card>
  );
}
