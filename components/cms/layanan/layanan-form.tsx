"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { AiMagicIcon, CheckmarkCircle02Icon, SentIcon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { listProbisOptions, saveLayanan, suggestLayanan } from "@/app/cms/layanan/actions";
import { Banner } from "@/components/blocks/banner";
import { RefPicker, type RefLabels } from "@/components/blocks/ref-picker";
import { Segmented } from "@/components/blocks/segmented";
import { LinkPicker } from "@/components/cms/link-picker";
import { DeepRabField, SuggestItem, flash } from "@/components/cms/probis-form";
import { ReviewBadge } from "@/components/cms/review-badge";
import { Icon } from "@/components/icon";
import { Illustration } from "@/components/illustrations/illustration";
import { useRal } from "@/components/layanan/ral-context";
import { MOTION_OK, gsap, useGSAP } from "@/components/motion/gsap";
import { Reveal } from "@/components/motion/reveal";
import { useRab } from "@/components/probis/rab-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { LayananSuggestion } from "@/lib/ai/layanan-suggest";
import { metodeLabel, metodeOptions, targetLabel, targetOptions, type Metode, type Target } from "@/lib/layanan/reference";
import type { LayananInput } from "@/lib/layanan/schema";
import { pdByCode, perangkatDaerah, type PeriodOptions } from "@/lib/probis/reference";
import type { LayananRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

type Values = { [K in Exclude<keyof LayananInput, "probis">]-?: string } & { probis: string[] };
type ProbisOption = { code: string; name: string };

const ralLabels: RefLabels = { ref: "RAL", l1: "jenis layanan", l2: "urusan", l3: "sub-urusan" };
const NONE = "__none";

const fromRecord = (r: LayananRecord | null, lockedOpd: string | null, activePeriod: string): Values => ({
  opd: r?.opdCode ?? lockedOpd ?? "",
  name: r?.name ?? "",
  period: r?.period || activePeriod,
  tujuan: r?.tujuan ?? "",
  fungsi: r?.fungsi ?? "",
  unit: r?.unit ?? "",
  target: r?.target ?? "",
  metode: r?.metode ?? "",
  ral3: r?.ral3 ?? "",
  ralL4: r?.ralL4 ?? "",
  ralL5: r?.ralL5 ?? "",
  rab2: r?.rab2 ?? "",
  manfaat: r?.manfaat ?? "",
  ekonomi: r?.ekonomi ?? "",
  risiko: r?.risiko ?? "",
  mitigasi: r?.mitigasi ?? "",
  kl: r?.kl ?? "",
  probis: r?.probis.map((p) => p.id) ?? [],
});

/** Form tambah/ubah layanan (kolom template analis) dengan asisten AI, pemilih RAL, dan tautan proses bisnis. */
export function LayananForm({ record, lockedOpd, periods: { periods, active } }: { record: LayananRecord | null; lockedOpd: string | null; periods: PeriodOptions }) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<Values>(() => fromRecord(record, lockedOpd, active));
  const [errors, setErrors] = useState<Record<string, string>>({});
  /** Versi RAL & RAB mengikuti periode layanan. */
  const ral = useRal(values.period);
  const rab = useRab(values.period);
  const [saving, startSaving] = useTransition();
  const [savingMode, setSavingMode] = useState<"draft" | "submit" | null>(null);
  const [done, setDone] = useState<{ submitted: boolean } | null>(null);

  const [note, setNote] = useState("");
  const [thinking, startThinking] = useTransition();
  const [suggestion, setSuggestion] = useState<LayananSuggestion | null>(null);
  const panel = useRef<HTMLDivElement>(null);

  // Pilihan proses bisnis mengikuti OPD + periode; nama probis tertaut disimpan agar chip tetap terbaca.
  const [probisOptions, setProbisOptions] = useState<ProbisOption[]>(() => record?.probis.map((p) => ({ code: p.id, name: p.name })) ?? []);
  const [loadingProbis, startProbis] = useTransition();
  useEffect(() => {
    if (!values.opd || !values.period) return;
    startProbis(async () => {
      const result = await listProbisOptions(values.opd, values.period);
      if (result.ok) setProbisOptions(result.data);
    });
  }, [values.opd, values.period]);

  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };
  const field = (key: keyof Values) => form.current?.querySelector(`[data-field="${key}"]`) ?? null;

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
      setErrors((e) => ({ ...e, name: "Isi nama layanan dulu agar AI punya konteks" }));
      flash(field("name"));
      return;
    }
    startThinking(async () => {
      const request = suggestLayanan({ name: values.name, opd: values.opd, note, period: values.period });
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
    apply("tujuan", suggestion.tujuan);
    apply("fungsi", suggestion.fungsi);
    apply("target", suggestion.target);
    if (suggestion.metode) apply("metode", suggestion.metode);
    if (suggestion.ral[0]) apply("ral3", suggestion.ral[0].code);
    apply("manfaat", suggestion.manfaat);
    apply("ekonomi", suggestion.ekonomi);
    apply("risiko", suggestion.risiko);
    apply("mitigasi", suggestion.mitigasi);
    if (suggestion.kl && !values.kl) apply("kl", suggestion.kl);
    toast.success("Semua saran diterapkan", { description: "Periksa kembali sebelum menyimpan." });
  };

  const submit = (mode: "draft" | "submit") => {
    setSavingMode(mode);
    startSaving(async () => {
      const result = await saveLayanan(values as LayananInput, { id: record?.id, submit: mode === "submit" });
      if (!result.ok) {
        setErrors(result.fields ?? {});
        toast.error(result.error);
        const first = Object.keys(result.fields ?? {})[0];
        if (first) field(first as keyof Values)?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      setDone({ submitted: mode === "submit" });
    });
  };

  return (
    <Reveal className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
      <form ref={form} onSubmit={(e) => (e.preventDefault(), submit("draft"))} className="grid min-w-0 gap-5" noValidate>
        {record?.ralReview && (
          <Banner variant="warning" label="Perlu pemetaan" dismissible={false}>
            Versi RAL periode {record.period} sudah berganti dan RAL layanan ini belum punya padanan. Pilih ulang RAL Level 3 lalu simpan.
          </Banner>
        )}
        <Card data-reveal>
          <CardHeader>
            <CardTitle className="section-title">Identitas</CardTitle>
            <CardDescription>
              ID: <b className="tabular-nums">{record?.code ?? (values.ral3 ? `GSK-LYN ${values.ral3.slice(4)}.xx (otomatis)` : "dibuat otomatis dari RAL Level 3")}</b>
              {record && <ReviewBadge status={record.status} />}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field data-field="name" data-invalid={!!errors.name || undefined} className="rounded-lg">
                <FieldLabel htmlFor="name">Nama layanan</FieldLabel>
                <Input id="name" value={values.name} onChange={(e) => set("name", e.target.value)} placeholder="mis. Layanan Penerbitan Akta Kelahiran" aria-invalid={!!errors.name || undefined} />
                <FieldError>{errors.name}</FieldError>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field data-field="opd" data-invalid={!!errors.opd || undefined}>
                  <FieldLabel htmlFor="opd">Unit pelaksana (Perangkat Daerah)</FieldLabel>
                  <Select value={values.opd || undefined} onValueChange={(v) => (set("opd", v), set("probis", []))} disabled={!!lockedOpd}>
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
                  <Select value={values.period} onValueChange={(v) => (set("period", v), set("probis", []))}>
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

              <Field data-field="unit" className="rounded-lg">
                <FieldLabel htmlFor="unit">
                  Bidang/UPT pelaksana <span className="font-normal text-muted-foreground">(opsional)</span>
                </FieldLabel>
                <Input id="unit" value={values.unit} onChange={(e) => set("unit", e.target.value)} placeholder="mis. Bidang Pelayanan Pendaftaran Penduduk" />
              </Field>

              <Field data-field="tujuan" data-invalid={!!errors.tujuan || undefined} className="rounded-lg">
                <FieldLabel htmlFor="tujuan">Tujuan layanan</FieldLabel>
                <Textarea id="tujuan" rows={3} value={values.tujuan} onChange={(e) => set("tujuan", e.target.value)} aria-invalid={!!errors.tujuan || undefined} />
                <FieldError>{errors.tujuan}</FieldError>
              </Field>
              <Field data-field="fungsi" className="rounded-lg">
                <FieldLabel htmlFor="fungsi">Fungsi layanan</FieldLabel>
                <Textarea id="fungsi" rows={2} value={values.fungsi} onChange={(e) => set("fungsi", e.target.value)} />
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card data-reveal>
          <CardHeader>
            <CardTitle className="section-title">Klasifikasi</CardTitle>
            <CardDescription>Cukup pilih RAL Level 3; Level 1 dan 2 mengikuti kodenya.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field data-field="ral3" data-invalid={!!errors.ral3 || undefined} className="rounded-lg">
                <FieldLabel htmlFor="ral3">RAL Level 3</FieldLabel>
                <RefPicker
                  id="ral3"
                  index={ral}
                  labels={ralLabels}
                  value={values.ral3 || null}
                  onChange={(code) => {
                    set("ral3", code ?? "");
                    // L4/L5 terdaftar yang bukan turunan L3 baru dikosongkan.
                    if (ral.byCode.has(values.ralL4) && ral.byCode.get(values.ralL4)?.parent !== code) {
                      set("ralL4", "");
                      set("ralL5", "");
                    }
                  }}
                  invalid={!!errors.ral3}
                />
                <FieldError>{errors.ral3}</FieldError>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <DeepRabField
                  refLabel="RAL"
                  rab={ral}
                  level={4}
                  parent={values.ral3}
                  value={values.ralL4}
                  error={errors.ralL4}
                  onChange={(v) => {
                    set("ralL4", v);
                    if (ral.byCode.get(values.ralL5)?.parent !== v) set("ralL5", ral.byCode.has(values.ralL5) ? "" : values.ralL5);
                  }}
                />
                <DeepRabField refLabel="RAL" rab={ral} level={5} parent={ral.byCode.get(values.ralL4)?.level === 4 ? values.ralL4 : ""} value={values.ralL5} error={errors.ralL5} onChange={(v) => set("ralL5", v)} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field data-field="rab2" data-invalid={!!errors.rab2 || undefined} className="rounded-lg">
                  <FieldLabel htmlFor="rab2">Urusan pemerintahan (RAB Level 2)</FieldLabel>
                  <Select value={values.rab2 || NONE} onValueChange={(v) => set("rab2", v === NONE ? "" : v)}>
                    <SelectTrigger id="rab2" className="h-auto min-h-9 w-full text-left whitespace-normal" aria-invalid={!!errors.rab2 || undefined}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-80">
                      <SelectItem value={NONE}>Tidak diisi</SelectItem>
                      {rab.level(2, true).map((n) => (
                        <SelectItem key={n.code} value={n.code}>
                          <span className="text-xs text-muted-foreground tabular-nums">{n.code}</span> {n.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError>{errors.rab2}</FieldError>
                </Field>
                <Field data-field="kl" className="rounded-lg">
                  <FieldLabel htmlFor="kl">Kementerian/Lembaga terkait</FieldLabel>
                  <Input id="kl" value={values.kl} onChange={(e) => set("kl", e.target.value)} placeholder="mis. Kementerian Dalam Negeri" />
                </Field>
              </div>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card data-reveal>
          <CardHeader>
            <CardTitle className="section-title">Penyelenggaraan</CardTitle>
            <CardDescription>Metode Elektronik dan Hybrid dihitung sebagai layanan terdigitalisasi.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field data-field="target" data-invalid={!!errors.target || undefined} className="rounded-lg">
                <FieldLabel>Target layanan</FieldLabel>
                <Segmented label="Target layanan" value={values.target as Target} onChange={(v) => set("target", v)} options={targetOptions} />
                <FieldError>{errors.target}</FieldError>
              </Field>
              <Field data-field="metode" data-invalid={!!errors.metode || undefined} className="rounded-lg">
                <FieldLabel>Metode layanan</FieldLabel>
                <Segmented label="Metode layanan" value={values.metode as Metode} onChange={(v) => set("metode", v)} options={metodeOptions} />
                <FieldError>{errors.metode}</FieldError>
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card data-reveal>
          <CardHeader>
            <CardTitle className="section-title">Manfaat & risiko</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field data-field="manfaat" className="rounded-lg">
                  <FieldLabel htmlFor="manfaat">Potensi manfaat</FieldLabel>
                  <Textarea id="manfaat" rows={3} value={values.manfaat} onChange={(e) => set("manfaat", e.target.value)} />
                </Field>
                <Field data-field="ekonomi" className="rounded-lg">
                  <FieldLabel htmlFor="ekonomi">Potensi ekonomi</FieldLabel>
                  <Textarea id="ekonomi" rows={3} value={values.ekonomi} onChange={(e) => set("ekonomi", e.target.value)} />
                </Field>
                <Field data-field="risiko" className="rounded-lg">
                  <FieldLabel htmlFor="risiko">Potensi risiko</FieldLabel>
                  <Textarea id="risiko" rows={3} value={values.risiko} onChange={(e) => set("risiko", e.target.value)} />
                </Field>
                <Field data-field="mitigasi" data-invalid={!!errors.mitigasi || undefined} className="rounded-lg">
                  <FieldLabel htmlFor="mitigasi">Mitigasi risiko</FieldLabel>
                  <Textarea id="mitigasi" rows={3} value={values.mitigasi} onChange={(e) => set("mitigasi", e.target.value)} aria-invalid={!!errors.mitigasi || undefined} />
                  <FieldError>{errors.mitigasi}</FieldError>
                </Field>
              </div>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card data-reveal>
          <CardHeader>
            <CardTitle className="section-title">Proses bisnis yang dilayani</CardTitle>
            <CardDescription>Proses bisnis {pdByCode.get(values.opd)?.name ?? "Perangkat Daerah"} pada periode {values.period}.</CardDescription>
          </CardHeader>
          <CardContent>
            <Field data-field="probis" data-invalid={!!errors.probis || undefined} className="rounded-lg">
              <LinkPicker noun="proses bisnis" disabledText="Pilih Perangkat Daerah dulu" options={probisOptions} values={values.probis} loading={loadingProbis} disabled={!values.opd} onChange={(v) => set("probis", v)} />
              <FieldError>{errors.probis}</FieldError>
            </Field>
          </CardContent>
        </Card>

        <div className="sticky bottom-3 z-20 flex flex-wrap items-center justify-end gap-2 rounded-2xl bg-card/90 p-3 shadow-raised backdrop-blur-md" data-reveal>
          <Button asChild variant="ghost" className="mr-auto">
            <Link href="/cms/layanan">Batal</Link>
          </Button>
          <Button type="button" variant="outline" loading={saving && savingMode === "draft"} disabled={saving} onClick={() => submit("draft")}>
            Simpan draf
          </Button>
          <Button type="button" loading={saving && savingMode === "submit"} disabled={saving} onClick={() => submit("submit")}>
            {!(saving && savingMode === "submit") && <Icon icon={SentIcon} size={16} />}
            Ajukan verifikasi
          </Button>
        </div>
      </form>

      <Card ref={panel} data-reveal className="gap-4 xl:sticky xl:top-20">
        <CardHeader>
          <CardTitle className="section-title">Asisten AI</CardTitle>
          <CardDescription>Menyusun tujuan, fungsi, manfaat, risiko, dan menyarankan RAL dari nama layanan.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Catatan tambahan (opsional), mis. pengajuan daring lewat aplikasi" aria-label="Catatan untuk AI" />
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
              <SuggestItem label="Tujuan" text={suggestion.tujuan} onApply={() => apply("tujuan", suggestion.tujuan)} />
              <SuggestItem label="Fungsi" text={suggestion.fungsi} onApply={() => apply("fungsi", suggestion.fungsi)} />
              <SuggestItem
                label="Target & metode"
                text={[targetLabel[suggestion.target], suggestion.metode && metodeLabel[suggestion.metode]].filter(Boolean).join(" · ")}
                onApply={() => (apply("target", suggestion.target), suggestion.metode && apply("metode", suggestion.metode))}
              />
              <div data-suggest className="grid gap-1.5 rounded-xl bg-muted/60 p-3">
                <p className="eyebrow">RAL Level 3</p>
                {suggestion.ral.map((r) => (
                  <button
                    key={r.code}
                    type="button"
                    onClick={() => apply("ral3", r.code)}
                    className={cn(
                      "grid gap-0.5 rounded-lg border bg-card px-3 py-2 text-left text-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-teal hover:shadow-card",
                      values.ral3 === r.code && "border-brand-teal bg-brand-teal/10",
                    )}
                  >
                    <span className="font-semibold">
                      <span className="mr-1 text-muted-foreground tabular-nums">{r.code}</span>
                      {ral.byCode.get(r.code)?.name}
                    </span>
                    <span className="text-muted-foreground">{r.reason}</span>
                  </button>
                ))}
              </div>
              <SuggestItem label="Potensi manfaat" text={suggestion.manfaat} onApply={() => apply("manfaat", suggestion.manfaat)} />
              <SuggestItem label="Risiko & mitigasi" text={`${suggestion.risiko} — ${suggestion.mitigasi}`} onApply={() => (apply("risiko", suggestion.risiko), apply("mitigasi", suggestion.mitigasi))} />
            </div>
          ) : (
            <Illustration name="service-desk" className="mx-auto w-44 opacity-90" />
          )}
        </CardContent>
      </Card>

      <Dialog open={!!done} onOpenChange={(open) => !open && router.push("/cms/layanan")}>
        <DialogContent className="text-center sm:max-w-sm">
          <Illustration name="success" loop={false} className="mx-auto w-32" />
          <DialogTitle>{done?.submitted ? "Layanan diajukan" : "Draf tersimpan"}</DialogTitle>
          <DialogDescription>{done?.submitted ? "Menunggu verifikasi Bagian Organisasi." : `${values.name} — ${pdByCode.get(values.opd)?.name ?? ""}`}</DialogDescription>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <Button variant="outline" onClick={() => (record ? router.push(`/cms/layanan/${record.id}`) : (setDone(null), setValues(fromRecord(null, lockedOpd, active)), setSuggestion(null)))}>
              {record ? "Tetap di sini" : "Tambah lagi"}
            </Button>
            <Button onClick={() => router.push("/cms/layanan")}>
              <Icon icon={CheckmarkCircle02Icon} size={16} />
              Lihat daftar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Reveal>
  );
}
