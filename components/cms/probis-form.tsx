"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { AiMagicIcon, CheckmarkCircle02Icon, SentIcon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { saveProbis, suggestProbis } from "@/app/cms/actions";
import { RabPicker } from "@/components/blocks/rab-picker";
import { Segmented } from "@/components/blocks/segmented";
import { ReviewBadge } from "@/components/cms/review-badge";
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
import type { ProbisSuggestion } from "@/lib/ai/probis-suggest";
import { useRab } from "@/components/probis/rab-context";
import { Banner } from "@/components/blocks/banner";
import type { RabIndex } from "@/lib/probis/rab-index";
import { pdByCode, perangkatDaerah, sasaranStrategis, statusOptions, type PeriodOptions } from "@/lib/probis/reference";
import type { ProbisInput } from "@/lib/probis/schema";
import type { ProbisRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

type Values = { [K in keyof ProbisInput]-?: string };
const OTHER = "__lainnya";

const fromRecord = (r: ProbisRecord | null, lockedOpd: string | null, activePeriod: string): Values => ({
  opd: r?.opdCode ?? lockedOpd ?? "",
  name: r?.name ?? "",
  description: r?.description ?? "",
  probisStatus: r?.probisStatus ?? "as_is",
  period: r?.period || activePeriod,
  rab3: r?.rab3 ?? "",
  rabL4: r?.rabL4 ?? "",
  rabL5: r?.rabL5 ?? "",
  strategicGoal: r?.strategicGoal ?? "",
  iku: r?.iku ?? "",
  ikuTarget: r?.ikuTarget ?? "",
  ikuRealization: r?.ikuRealization ?? "",
});

/** Sorot sebentar kolom yang baru diisi (oleh AI atau otomatis). */
export function flash(el: Element | null) {
  if (!el) return;
  gsap.matchMedia().add(MOTION_OK, () => {
    gsap.fromTo(el, { backgroundColor: "color-mix(in oklab, var(--brand-yellow) 45%, transparent)" }, { backgroundColor: "transparent", duration: 1.4, ease: "power2.out", clearProps: "backgroundColor" });
  });
}

/** Form tambah/ubah Proses Bisnis dengan asisten AI dan pemilih RAB otomatis. */
export function ProbisForm({ record, lockedOpd, periods: { periods, active } }: { record: ProbisRecord | null; lockedOpd: string | null; periods: PeriodOptions }) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<Values>(() => fromRecord(record, lockedOpd, active));
  const [errors, setErrors] = useState<Record<string, string>>({});
  /** Versi RAB mengikuti periode probis. */
  const rab = useRab(values.period);
  const [customGoal, setCustomGoal] = useState(() => !!record?.strategicGoal && !sasaranStrategis.includes(record.strategicGoal));
  const [saving, startSaving] = useTransition();
  const [savingMode, setSavingMode] = useState<"draft" | "submit" | null>(null);
  const [done, setDone] = useState<{ id: string; submitted: boolean } | null>(null);

  const [note, setNote] = useState("");
  const [thinking, startThinking] = useTransition();
  const [suggestion, setSuggestion] = useState<ProbisSuggestion | null>(null);
  const panel = useRef<HTMLDivElement>(null);

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
      setErrors((e) => ({ ...e, name: "Isi nama proses bisnis dulu agar AI punya konteks" }));
      flash(field("name"));
      return;
    }
    startThinking(async () => {
      const request = suggestProbis({ name: values.name, opd: values.opd, note, period: values.period });
      toast.promise(request.then((r) => (r.ok ? r : Promise.reject(new Error(r.error)))), {
        loading: "AI sedang menyusun saran…",
        success: (r) => (r.data.source === "gemini" ? "Saran dari Gemini siap" : "Saran lokal siap"),
        error: (e: Error) => e.message,
      });
      const result = await request;
      if (result.ok) setSuggestion(result.data);
    });
  };

  const apply = (key: keyof Values, value: string) => {
    set(key, value);
    if (key === "strategicGoal") setCustomGoal(!sasaranStrategis.includes(value));
    requestAnimationFrame(() => flash(field(key)));
  };
  const applyAll = () => {
    if (!suggestion) return;
    apply("description", suggestion.uraian);
    apply("strategicGoal", suggestion.sasaran);
    apply("iku", suggestion.iku);
    if (suggestion.rab[0]) apply("rab3", suggestion.rab[0].code);
    toast.success("Semua saran diterapkan", { description: "Periksa kembali sebelum menyimpan." });
  };

  const submit = (mode: "draft" | "submit") => {
    setSavingMode(mode);
    startSaving(async () => {
      const result = await saveProbis(values as ProbisInput, { id: record?.id, submit: mode === "submit" });
      if (!result.ok) {
        setErrors(result.fields ?? {});
        toast.error(result.error);
        const first = Object.keys(result.fields ?? {})[0];
        if (first) field(first as keyof Values)?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      setDone({ id: result.data.id, submitted: mode === "submit" });
    });
  };

  const goalSelect = customGoal ? OTHER : values.strategicGoal || undefined;

  return (
    <Reveal className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
      <form ref={form} onSubmit={(e) => (e.preventDefault(), submit("draft"))} className="grid min-w-0 gap-5" noValidate>
        {record?.rabReview && (
          <Banner variant="warning" label="Perlu pemetaan" dismissible={false}>
            Versi RAB periode {record.period} sudah berganti dan RAB probis ini belum punya padanan. Pilih ulang RAB Level 3 lalu simpan.
          </Banner>
        )}
        <Card data-reveal>
          <CardHeader>
            <CardTitle className="section-title">Identitas</CardTitle>
            <CardDescription>
              ID: <b className="tabular-nums">{record?.code ?? (values.rab3 ? `GSK-DAB ${values.rab3.slice(4)}.xx (otomatis)` : "dibuat otomatis dari RAB Level 3")}</b>
              {record && <ReviewBadge status={record.status} />}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field data-field="opd" data-invalid={!!errors.opd || undefined}>
                <FieldLabel htmlFor="opd">Unit kerja (Perangkat Daerah)</FieldLabel>
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

              <Field data-field="name" data-invalid={!!errors.name || undefined} className="rounded-lg">
                <FieldLabel htmlFor="name">Nama bisnis/urusan</FieldLabel>
                <Input id="name" value={values.name} onChange={(e) => set("name", e.target.value)} placeholder="mis. Pengelolaan Pengaduan Masyarakat" aria-invalid={!!errors.name || undefined} />
                <FieldError>{errors.name}</FieldError>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel>Status probis</FieldLabel>
                  <Segmented label="Status probis" value={values.probisStatus as "new" | "upgrade" | "as_is"} onChange={(v) => set("probisStatus", v)} options={statusOptions} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="period">Periode arsitektur</FieldLabel>
                  <Select value={values.period} onValueChange={(v) => set("period", v)}>
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

              <Field data-field="description" className="rounded-lg">
                <FieldLabel htmlFor="description">Uraian bisnis/urusan</FieldLabel>
                <Textarea id="description" rows={4} value={values.description} onChange={(e) => set("description", e.target.value)} placeholder="Deskripsi urusan pemerintahan yang diselenggarakan" />
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card data-reveal>
          <CardHeader>
            <CardTitle className="section-title">Klasifikasi RAB</CardTitle>
            <CardDescription>Cukup pilih Level 3; Level 1 dan 2 mengikuti kodenya.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field data-field="rab3" data-invalid={!!errors.rab3 || undefined} className="rounded-lg">
                <FieldLabel htmlFor="rab3">RAB Level 3</FieldLabel>
                <RabPicker
                  id="rab3"
                  period={values.period}
                  value={values.rab3 || null}
                  onChange={(code) => {
                    set("rab3", code ?? "");
                    // L4/L5 terdaftar yang bukan turunan L3 baru dikosongkan.
                    if (rab.byCode.has(values.rabL4) && rab.byCode.get(values.rabL4)?.parent !== code) {
                      set("rabL4", "");
                      set("rabL5", "");
                    }
                  }}
                  invalid={!!errors.rab3}
                />
                <FieldError>{errors.rab3}</FieldError>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <DeepRabField rab={rab} level={4} parent={values.rab3} value={values.rabL4} error={errors.rabL4} onChange={(v) => {
                  set("rabL4", v);
                  if (rab.byCode.get(values.rabL5)?.parent !== v) set("rabL5", rab.byCode.has(values.rabL5) ? "" : values.rabL5);
                }} />
                <DeepRabField rab={rab} level={5} parent={rab.byCode.get(values.rabL4)?.level === 4 ? values.rabL4 : ""} value={values.rabL5} error={errors.rabL5} onChange={(v) => set("rabL5", v)} />
              </div>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card data-reveal>
          <CardHeader>
            <CardTitle className="section-title">Kinerja</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field data-field="strategicGoal" className="rounded-lg">
                <FieldLabel htmlFor="goal">Sasaran strategis</FieldLabel>
                <Select
                  value={goalSelect}
                  onValueChange={(v) => {
                    setCustomGoal(v === OTHER);
                    set("strategicGoal", v === OTHER ? "" : v);
                  }}
                >
                  <SelectTrigger id="goal" className="h-auto min-h-9 w-full text-left whitespace-normal">
                    <SelectValue placeholder="Pilih sasaran strategis daerah" />
                  </SelectTrigger>
                  <SelectContent className="max-w-[min(42rem,90vw)]">
                    {sasaranStrategis.map((s) => (
                      <SelectItem key={s} value={s} className="whitespace-normal">{s}</SelectItem>
                    ))}
                    <SelectItem value={OTHER}>Tulis sendiri…</SelectItem>
                  </SelectContent>
                </Select>
                {customGoal && <Textarea rows={2} value={values.strategicGoal} onChange={(e) => set("strategicGoal", e.target.value)} placeholder="Sasaran strategis eselon 1 terkait" />}
              </Field>
              <Field data-field="iku" className="rounded-lg">
                <FieldLabel htmlFor="iku">Indikator Kinerja Utama (IKU)</FieldLabel>
                <Input id="iku" value={values.iku} onChange={(e) => set("iku", e.target.value)} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="ikuTarget">Nilai IKU target</FieldLabel>
                  <Input id="ikuTarget" value={values.ikuTarget} onChange={(e) => set("ikuTarget", e.target.value)} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="ikuRealization">Nilai IKU terealisasi</FieldLabel>
                  <Input id="ikuRealization" value={values.ikuRealization} onChange={(e) => set("ikuRealization", e.target.value)} />
                </Field>
              </div>
            </FieldGroup>
          </CardContent>
        </Card>

        <div className="sticky bottom-3 z-20 flex flex-wrap items-center justify-end gap-2 rounded-2xl bg-card/90 p-3 shadow-raised backdrop-blur-md" data-reveal>
          <Button asChild variant="ghost" className="mr-auto">
            <Link href="/cms/proses-bisnis">Batal</Link>
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
          <CardDescription>Menyusun uraian, sasaran, IKU, dan menyarankan RAB dari nama probis.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Catatan tambahan (opsional), mis. layanan daring untuk ASN" aria-label="Catatan untuk AI" />
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
              <SuggestItem label="Uraian" text={suggestion.uraian} onApply={() => apply("description", suggestion.uraian)} />
              <SuggestItem label="Sasaran strategis" text={suggestion.sasaran} onApply={() => apply("strategicGoal", suggestion.sasaran)} />
              <SuggestItem label="IKU" text={suggestion.iku} onApply={() => apply("iku", suggestion.iku)} />
              <div data-suggest className="grid gap-1.5 rounded-xl bg-muted/60 p-3">
                <p className="eyebrow">RAB Level 3</p>
                {suggestion.rab.map((r) => (
                  <button
                    key={r.code}
                    type="button"
                    onClick={() => apply("rab3", r.code)}
                    className={cn(
                      "grid gap-0.5 rounded-lg border bg-card px-3 py-2 text-left text-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-teal hover:shadow-card",
                      values.rab3 === r.code && "border-brand-teal bg-brand-teal/10",
                    )}
                  >
                    <span className="font-semibold">
                      <span className="mr-1 text-muted-foreground tabular-nums">{r.code}</span>
                      {rab.byCode.get(r.code)?.name}
                    </span>
                    <span className="text-muted-foreground">{r.reason}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <Illustration name="explore" className="mx-auto w-40 opacity-90" />
          )}
        </CardContent>
      </Card>

      <Dialog open={!!done} onOpenChange={(open) => !open && router.push("/cms/proses-bisnis")}>
        <DialogContent className="text-center sm:max-w-sm">
          <Illustration name="success" loop={false} className="mx-auto w-32" />
          <DialogTitle>{done?.submitted ? "Probis diajukan" : "Draf tersimpan"}</DialogTitle>
          <DialogDescription>
            {done?.submitted ? "Menunggu verifikasi Bagian Organisasi." : `${values.name} — ${pdByCode.get(values.opd)?.name ?? ""}`}
          </DialogDescription>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <Button variant="outline" onClick={() => (record ? router.push(`/cms/proses-bisnis/${record.id}`) : (setDone(null), setValues(fromRecord(null, lockedOpd, active)), setSuggestion(null)))}>
              {record ? "Tetap di sini" : "Tambah lagi"}
            </Button>
            <Button onClick={() => router.push("/cms/proses-bisnis")}>
              <Icon icon={CheckmarkCircle02Icon} size={16} />
              Lihat daftar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Reveal>
  );
}

export function SuggestItem({ label, text, onApply }: { label: string; text: string; onApply: () => void }) {
  return (
    <div data-suggest className="group/s grid gap-1 rounded-xl bg-muted/60 p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="eyebrow">{label}</p>
        <Button type="button" size="xs" variant="ghost" onClick={onApply} className="opacity-80 group-hover/s:opacity-100">
          Pakai
        </Button>
      </div>
      <p className="leading-relaxed">{text}</p>
    </div>
  );
}

const NONE = "__none";

/**
 * Referensi Level 4/5 (RAB atau RAL): dropdown dari referensi bila sudah tersedia di bawah induknya,
 * selain itu isian teks bebas (referensi L4/L5 di template masih kosong).
 */
export function DeepRabField({ rab, level, parent, value, error, onChange, refLabel = "RAB" }: { rab: RabIndex; level: 4 | 5; parent: string; value: string; error?: string; onChange: (value: string) => void; refLabel?: string }) {
  const options = rab.children(parent, true);
  const id = `${refLabel.toLowerCase()}L${level}`;
  return (
    <Field data-field={id} data-invalid={!!error || undefined} className="rounded-lg">
      <FieldLabel htmlFor={id}>
        {refLabel} Level {level} <span className="font-normal text-muted-foreground">(opsional)</span>
      </FieldLabel>
      {options.length ? (
        <Select value={value || NONE} onValueChange={(v) => onChange(v === NONE ? "" : v)}>
          <SelectTrigger id={id} className="h-auto min-h-9 w-full text-left whitespace-normal" aria-invalid={!!error || undefined}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Tidak diisi</SelectItem>
            {options.map((n) => (
              <SelectItem key={n.code} value={n.code} className="whitespace-normal">
                <span className="text-xs text-muted-foreground tabular-nums">{n.code}</span> {n.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={level === 4 ? "Teks bebas (referensi L4 belum ada)" : `${refLabel}.xx.xx.xx.xx.nn`} />
      )}
      <FieldError>{error}</FieldError>
    </Field>
  );
}
