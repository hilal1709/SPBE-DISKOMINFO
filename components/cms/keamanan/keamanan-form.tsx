"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { AiMagicIcon, CheckmarkCircle02Icon, SentIcon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { saveKeamanan, suggestKeamanan } from "@/app/cms/keamanan/actions";
import { SuggestItem, flash } from "@/components/cms/probis-form";
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
import type { KeamananSuggestion } from "@/lib/ai/keamanan-suggest";
import { groups, kegiatanConfig, type Kegiatan, type KegiatanField } from "@/lib/keamanan/jenis";
import type { KeamananInput } from "@/lib/keamanan/schema";
import { pdByCode, perangkatDaerah, type PeriodOptions } from "@/lib/probis/reference";
import type { KeamananRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

type Values = { opd: string; jenis: Kegiatan | ""; name: string; period: string; deskripsi: string; tanggal: string; atribut: Record<string, string> };

const fromRecord = (r: KeamananRecord | null, jenis: Kegiatan | null, lockedOpd: string | null, activePeriod: string): Values => ({
  opd: r?.opdCode ?? lockedOpd ?? "",
  jenis: r?.jenis ?? jenis ?? "",
  name: r?.name ?? "",
  period: r?.period || activePeriod,
  deskripsi: r?.deskripsi ?? "",
  tanggal: r?.tanggal ?? "",
  atribut: { ...(r?.atribut ?? {}) },
});

/** Form tambah/ubah kegiatan keamanan: pilih kegiatan dulu, kolom khusus mengikuti template analis kegiatan itu. */
export function KeamananForm({
  record,
  initialJenis,
  lockedOpd,
  periods: { periods, active },
}: {
  record: KeamananRecord | null;
  initialJenis: Kegiatan | null;
  lockedOpd: string | null;
  periods: PeriodOptions;
}) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const picker = useRef<HTMLDivElement>(null);
  const [values, setValues] = useState<Values>(() => fromRecord(record, initialJenis, lockedOpd, active));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const cfg = values.jenis ? kegiatanConfig[values.jenis] : null;
  const [saving, startSaving] = useTransition();
  const [savingMode, setSavingMode] = useState<"draft" | "submit" | null>(null);
  const [done, setDone] = useState<{ submitted: boolean } | null>(null);
  const [note, setNote] = useState("");
  const [thinking, startThinking] = useTransition();
  const [suggestion, setSuggestion] = useState<KeamananSuggestion | null>(null);
  const panel = useRef<HTMLDivElement>(null);

  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };
  const setAttr = (key: string, value: string) => {
    setValues((v) => ({ ...v, atribut: { ...v.atribut, [key]: value } }));
    setErrors((e) => ({ ...e, atribut: "" }));
  };
  const field = (key: string) => form.current?.querySelector(`[data-field="${key}"]`) ?? null;

  /** Ganti kegiatan: kolom khusus yang tidak berlaku dibuang. */
  const pickJenis = (jenis: Kegiatan) => {
    if (jenis === values.jenis) return;
    const keys = new Set(kegiatanConfig[jenis].attrs.map((a) => a.key));
    setValues((v) => ({ ...v, jenis, atribut: Object.fromEntries(Object.entries(v.atribut).filter(([k]) => keys.has(k))) }));
    setErrors((e) => ({ ...e, jenis: "" }));
  };

  useGSAP(
    () => {
      gsap.matchMedia().add(MOTION_OK, () => {
        gsap.from("[data-jenis]", { opacity: 0, y: 10, stagger: 0.03, duration: 0.35, ease: "power2.out", clearProps: "all" });
      });
    },
    { scope: picker },
  );
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
    startThinking(async () => {
      const request = suggestKeamanan({ name: values.name, opd: values.opd, jenis: values.jenis || null, note });
      toast.promise(request.then((r) => (r.ok ? r : Promise.reject(new Error(r.error)))), {
        loading: "AI sedang menyusun saran…",
        success: (r) => (r.data.source === "gemini" ? "Saran dari Gemini siap" : "Saran lokal siap"),
        error: (e: Error) => e.message,
      });
      const result = await request;
      if (result.ok) setSuggestion(result.data);
    });
  };

  const applyAll = () => {
    if (!suggestion) return;
    if (suggestion.jenis !== values.jenis) pickJenis(suggestion.jenis);
    setValues((v) => ({ ...v, deskripsi: suggestion.deskripsi, atribut: { ...v.atribut, ...suggestion.atribut } }));
    requestAnimationFrame(() => flash(field("deskripsi")));
    toast.success("Semua saran diterapkan", { description: "Periksa kembali sebelum menyimpan." });
  };

  const submit = (mode: "draft" | "submit") => {
    setSavingMode(mode);
    startSaving(async () => {
      const result = await saveKeamanan(values as KeamananInput, { id: record?.id, submit: mode === "submit" });
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
        <Card data-reveal>
          <CardHeader>
            <CardTitle as="h2" className="section-title">Kegiatan</CardTitle>
            <CardDescription>Kolom isian mengikuti template analis kegiatan yang dipilih.</CardDescription>
          </CardHeader>
          <CardContent>
            <div ref={picker} data-field="jenis" className={cn("grid gap-4 rounded-lg", errors.jenis && "ring-2 ring-destructive/40")}>
              {groups.map((g) => (
                <div key={g.key} className="grid gap-2">
                  <p className="eyebrow">{g.label}</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {g.jenis.map((k) => {
                      const c = kegiatanConfig[k];
                      const on = values.jenis === k;
                      return (
                        <button
                          key={k}
                          type="button"
                          data-jenis
                          onClick={() => pickJenis(k)}
                          aria-pressed={on}
                          style={{ ["--tone" as string]: `var(${c.tone})` }}
                          className={cn(
                            "relative overflow-hidden rounded-xl border bg-card px-3 py-2.5 text-left text-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card",
                            "before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-(--tone) before:opacity-60",
                            on && "border-(--tone) bg-(--tone)/10 font-semibold before:opacity-100",
                          )}
                        >
                          {c.short}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            {errors.jenis && <p className="mt-2 text-sm text-destructive">{errors.jenis}</p>}
          </CardContent>
        </Card>

        {cfg && (
          <Card data-reveal>
            <CardHeader>
              <CardTitle as="h2" className="section-title">Rincian</CardTitle>
              <CardDescription>
                ID: <b className="tabular-nums">{record?.code ?? `GSK-KAM ${cfg.abbr}.xxx (otomatis)`}</b>
                {record && <ReviewBadge status={record.status} />}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field data-field="name" data-invalid={!!errors.name || undefined} className="rounded-lg">
                  <FieldLabel htmlFor="name">{values.jenis === "standar" ? "Nama standar/prosedur" : "Nama kegiatan"}</FieldLabel>
                  <Input id="name" value={values.name} onChange={(e) => set("name", e.target.value)} placeholder={values.jenis === "standar" ? "mis. SOP Penanganan Insiden Siber" : "mis. Audit Keamanan SPBE Tahunan 2026"} aria-invalid={!!errors.name || undefined} />
                  <FieldError>{errors.name}</FieldError>
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field data-field="opd" data-invalid={!!errors.opd || undefined}>
                    <FieldLabel htmlFor="opd">Instansi pelaksana</FieldLabel>
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
                <Field data-field="deskripsi" className="rounded-lg">
                  <FieldLabel htmlFor="deskripsi">Deskripsi</FieldLabel>
                  <Textarea id="deskripsi" rows={2} value={values.deskripsi} onChange={(e) => set("deskripsi", e.target.value)} placeholder="Tujuan dan cakupan kegiatan" />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field data-field="tanggal" data-invalid={!!errors.tanggal || undefined} className="rounded-lg">
                    <FieldLabel htmlFor="tanggal">{cfg.dateLabel}</FieldLabel>
                    <Input id="tanggal" type="date" value={values.tanggal} onChange={(e) => set("tanggal", e.target.value)} aria-invalid={!!errors.tanggal || undefined} />
                    <FieldError>{errors.tanggal}</FieldError>
                  </Field>
                  {cfg.attrs.map((a) => (
                    <AttrInput key={a.key} attr={a} value={values.atribut[a.key] ?? ""} onChange={(v) => setAttr(a.key, v)} />
                  ))}
                </div>
                {errors.atribut && <p className="text-sm text-destructive">{errors.atribut}</p>}
              </FieldGroup>
            </CardContent>
          </Card>
        )}

        <div className="sticky bottom-3 z-20 flex flex-wrap items-center justify-end gap-2 rounded-2xl bg-card/90 p-3 shadow-raised backdrop-blur-md" data-reveal>
          <Button asChild variant="ghost" className="mr-auto">
            <Link href="/cms/keamanan">Batal</Link>
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
          <CardTitle as="h2" className="section-title">Asisten AI</CardTitle>
          <CardDescription>Menebak jenis kegiatan dari nama dan menyusun deskripsinya.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Catatan tambahan (opsional), mis. bersama BSSN" aria-label="Catatan untuk AI" />
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
              {suggestion.jenis !== values.jenis && <SuggestItem label="Kegiatan" text={kegiatanConfig[suggestion.jenis].label} onApply={() => pickJenis(suggestion.jenis)} />}
              <SuggestItem label="Deskripsi" text={suggestion.deskripsi} onApply={() => (set("deskripsi", suggestion.deskripsi), requestAnimationFrame(() => flash(field("deskripsi"))))} />
              {Object.keys(suggestion.atribut).length > 0 && (
                <SuggestItem
                  label="Kolom khusus"
                  text={Object.entries(suggestion.atribut)
                    .map(([k, v]) => `${kegiatanConfig[suggestion.jenis].attrs.find((a) => a.key === k)?.label ?? k}: ${v}`)
                    .join(" · ")}
                  onApply={() => setValues((v) => ({ ...v, atribut: { ...v.atribut, ...suggestion.atribut } }))}
                />
              )}
            </div>
          ) : (
            <Illustration name="security-shield" className="mx-auto w-48 opacity-90" />
          )}
        </CardContent>
      </Card>

      <Dialog open={!!done} onOpenChange={(open) => !open && router.push("/cms/keamanan")}>
        <DialogContent className="text-center sm:max-w-sm">
          <Illustration name="success" loop={false} className="mx-auto w-32" />
          <DialogTitle>{done?.submitted ? "Kegiatan diajukan" : "Draf tersimpan"}</DialogTitle>
          <DialogDescription>{done?.submitted ? "Menunggu verifikasi Verifikator Keamanan Diskominfo." : `${values.name} — ${pdByCode.get(values.opd)?.name ?? ""}`}</DialogDescription>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <Button variant="outline" onClick={() => (record ? router.push(`/cms/keamanan/${record.id}`) : (setDone(null), setValues(fromRecord(null, values.jenis || null, lockedOpd, active)), setSuggestion(null)))}>
              {record ? "Tetap di sini" : "Tambah lagi"}
            </Button>
            <Button onClick={() => router.push("/cms/keamanan")}>
              <Icon icon={CheckmarkCircle02Icon} size={16} />
              Lihat daftar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Reveal>
  );
}

/** Satu kolom khusus: pilihan tetap, tanggal, nilai 0–5, teks panjang. */
function AttrInput({ attr, value, onChange }: { attr: KegiatanField; value: string; onChange: (value: string) => void }) {
  const id = `attr-${attr.key}`;
  return (
    <Field data-field={id} className={cn("rounded-lg", attr.type === "textarea" && "sm:col-span-2")}>
      <FieldLabel htmlFor={id}>{attr.label}</FieldLabel>
      {attr.type === "select" ? (
        <Select value={value || undefined} onValueChange={onChange}>
          <SelectTrigger id={id} className="w-full">
            <SelectValue placeholder="Pilih" />
          </SelectTrigger>
          <SelectContent>
            {[...attr.options!, ...(value && !attr.options!.includes(value) ? [value] : [])].map((o) => (
              <SelectItem key={o} value={o}>{o}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : attr.type === "textarea" ? (
        <Textarea id={id} rows={2} value={value} onChange={(e) => onChange(e.target.value)} placeholder={attr.placeholder} />
      ) : attr.type === "date" ? (
        <Input id={id} type="date" value={value} onChange={(e) => onChange(e.target.value)} />
      ) : attr.type === "score" ? (
        <Input id={id} type="text" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} placeholder={attr.placeholder} />
      ) : (
        <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={attr.placeholder} />
      )}
      {attr.type === "date" && attr.placeholder && <FieldDescription>{attr.placeholder}</FieldDescription>}
    </Field>
  );
}
