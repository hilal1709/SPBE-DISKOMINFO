"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { AiMagicIcon, CheckmarkCircle02Icon, SentIcon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { listInfraOptions, saveInfrastruktur, suggestInfrastruktur } from "@/app/cms/infrastruktur/actions";
import { useRai } from "@/components/infrastruktur/rai-context";
import { Banner } from "@/components/blocks/banner";
import { RefPicker, type RefLabels } from "@/components/blocks/ref-picker";
import { Segmented } from "@/components/blocks/segmented";
import { Collapsible, PickList } from "@/components/cms/aplikasi/aplikasi-form";
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
import type { InfrastrukturSuggestion } from "@/lib/ai/infrastruktur-suggest";
import type { SecurityKey } from "@/lib/data/reference";
import { infraTargets, jenisConfig, kepemilikanOptions, layers, type AttrField, type InfraJenis, type InfraKepemilikan } from "@/lib/infrastruktur/jenis";
import type { InfrastrukturInput } from "@/lib/infrastruktur/schema";
import { pdByCode, perangkatDaerah, type PeriodOptions } from "@/lib/probis/reference";
import type { InfrastrukturRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

type Text = "opd" | "name" | "period" | "deskripsi" | "pemilik" | "kepemilikan" | "pengelola" | "rai";
type Values = { [K in Text]: string } & {
  jenis: InfraJenis | "";
  atribut: Record<string, string>;
  relasi: string[];
  aplikasi: string[];
  data: string[];
  probis: string[];
  security: Partial<Record<SecurityKey, string[]>>;
};
type Options = { infra: (LinkOption & { jenis: InfraJenis })[]; aplikasi: LinkOption[]; data: LinkOption[]; probis: LinkOption[]; loaded: boolean };

const raiLabels: RefLabels = { ref: "RAI", l1: "lapisan", l2: "kelompok", l3: "sub-kelompok" };

const fromRecord = (r: InfrastrukturRecord | null, jenis: InfraJenis | null, lockedOpd: string | null, activePeriod: string): Values => ({
  opd: r?.opdCode ?? lockedOpd ?? "",
  jenis: r?.jenis ?? jenis ?? "",
  name: r?.name ?? "",
  period: r?.period || activePeriod,
  deskripsi: r?.deskripsi ?? "",
  pemilik: r?.pemilik ?? "",
  kepemilikan: r?.kepemilikan ?? "",
  pengelola: r?.pengelola ?? "",
  rai: r?.rai3 ?? r?.rai2 ?? (jenis ? jenisConfig[jenis].rai : ""),
  atribut: { ...(r?.atribut ?? {}) },
  relasi: r?.relasi.map((x) => x.id) ?? [],
  aplikasi: r?.aplikasi.map((x) => x.id) ?? [],
  data: r?.data.map((x) => x.id) ?? [],
  probis: r?.probis.map((x) => x.id) ?? [],
  security: (r?.security ?? {}) as Values["security"],
});

const hintOf = (opd: string, own: string) => (opd === own ? undefined : pdByCode.get(opd)?.name);

/** Form tambah/ubah komponen infrastruktur: pilih komponen dulu, kolom khusus mengikuti template analis komponen itu. */
export function InfrastrukturForm({
  record,
  initialJenis,
  lockedOpd,
  periods: { periods, active },
}: {
  record: InfrastrukturRecord | null;
  initialJenis: InfraJenis | null;
  lockedOpd: string | null;
  periods: PeriodOptions;
}) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const picker = useRef<HTMLDivElement>(null);
  const [values, setValues] = useState<Values>(() => fromRecord(record, initialJenis, lockedOpd, active));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const rai = useRai(values.period);
  const cfg = values.jenis ? jenisConfig[values.jenis] : null;
  const [saving, startSaving] = useTransition();
  const [savingMode, setSavingMode] = useState<"draft" | "submit" | null>(null);
  const [done, setDone] = useState<{ submitted: boolean } | null>(null);

  const [note, setNote] = useState("");
  const [thinking, startThinking] = useTransition();
  const [suggestion, setSuggestion] = useState<InfrastrukturSuggestion | null>(null);
  const panel = useRef<HTMLDivElement>(null);

  // Pilihan relasi mengikuti periode; nama entri tertaut disimpan agar chip tetap terbaca sebelum daftar dimuat.
  const [options, setOptions] = useState<Options>(() => ({
    infra: [...(record?.relasi ?? [])].map((x) => ({ code: x.id, name: x.name, jenis: x.jenis })),
    aplikasi: record?.aplikasi.map((x) => ({ code: x.id, name: x.name })) ?? [],
    data: record?.data.map((x) => ({ code: x.id, name: x.name })) ?? [],
    probis: record?.probis.map((x) => ({ code: x.id, name: x.name })) ?? [],
    loaded: false,
  }));
  const [loadingDeps, startDeps] = useTransition();
  useEffect(() => {
    if (!values.period) return;
    startDeps(async () => {
      const result = await listInfraOptions(values.opd, values.period);
      if (!result.ok) return;
      const map = (list: { code: string; name: string; opd: string }[]) => list.map((x) => ({ code: x.code, name: x.name, hint: hintOf(x.opd, values.opd) }));
      setOptions({
        infra: result.data.infra.filter((x) => x.code !== record?.code).map((x) => ({ code: x.code, name: x.name, jenis: x.jenis, hint: [jenisConfig[x.jenis].short, hintOf(x.opd, values.opd)].filter(Boolean).join(" · ") })),
        aplikasi: map(result.data.aplikasi),
        data: map(result.data.data),
        probis: map(result.data.probis),
        loaded: true,
      });
    });
  }, [values.opd, values.period, record?.code]);

  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };
  const setAttr = (key: string, value: string) => setValues((v) => ({ ...v, atribut: { ...v.atribut, [key]: value } }));
  const field = (key: string) => form.current?.querySelector(`[data-field="${key}"]`) ?? null;

  /** Ganti komponen: kolom khusus & relasi yang tidak berlaku dibuang, RAI ikut bawaan komponen. */
  const pickJenis = (jenis: InfraJenis) => {
    if (jenis === values.jenis) return;
    const next = jenisConfig[jenis];
    const allowed = new Set<string>(infraTargets(jenis));
    setValues((v) => ({
      ...v,
      jenis,
      rai: next.rai,
      atribut: Object.fromEntries(Object.entries(v.atribut).filter(([k]) => next.attrs.some((a) => a.key === k))),
      relasi: v.relasi.filter((code) => allowed.has(options.infra.find((o) => o.code === code)?.jenis ?? "")),
      aplikasi: next.relasi.includes("aplikasi") ? v.aplikasi : [],
      data: next.relasi.includes("data") ? v.data : [],
      probis: next.relasi.includes("probis") ? v.probis : [],
    }));
    setErrors((e) => ({ ...e, jenis: "" }));
    setSuggestion(null);
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
    if (values.name.trim().length < 2) {
      setErrors((e) => ({ ...e, name: "Isi nama komponen dulu agar AI punya konteks" }));
      flash(field("name"));
      return;
    }
    startThinking(async () => {
      const request = suggestInfrastruktur({ name: values.name, opd: values.opd, jenis: values.jenis || null, note, period: values.period });
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
    if (suggestion.jenis !== values.jenis) pickJenis(suggestion.jenis);
    apply("deskripsi", suggestion.deskripsi);
    if (suggestion.rai[0]) apply("rai", suggestion.rai[0].code);
    setValues((v) => ({ ...v, atribut: { ...v.atribut, ...suggestion.atribut }, relasi: [...new Set([...v.relasi, ...suggestion.relasi.map((r) => r.code)])] }));
    toast.success("Semua saran diterapkan", { description: "Periksa kembali sebelum menyimpan." });
  };

  const submit = (mode: "draft" | "submit") => {
    if (!values.jenis) {
      setErrors((e) => ({ ...e, jenis: "Pilih komponen infrastruktur" }));
      picker.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setSavingMode(mode);
    startSaving(async () => {
      const result = await saveInfrastruktur(values as InfrastrukturInput, { id: record?.id, submit: mode === "submit" });
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

  const allowedInfra = values.jenis ? new Set<string>(infraTargets(values.jenis)) : new Set<string>();
  const infraOptions = options.infra.filter((o) => allowedInfra.has(o.jenis));
  const visibleAttrs = cfg?.attrs.filter((a) => !a.when || values.atribut[a.when.key] === a.when.value) ?? [];
  const nameOf = (code: string) => options.infra.find((o) => o.code === code)?.name ?? code;

  return (
    <Reveal className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
      <form ref={form} onSubmit={(e) => (e.preventDefault(), submit("draft"))} className="grid min-w-0 gap-5" noValidate>
        {record?.raiReview && (
          <Banner variant="warning" label="Perlu pemetaan" dismissible={false}>
            Versi RAI periode {record.period} sudah berganti dan RAI komponen ini belum punya padanan. Pilih ulang RAI lalu simpan.
          </Banner>
        )}

        <Card data-reveal>
          <CardHeader>
            <CardTitle className="section-title">Komponen</CardTitle>
            <CardDescription>Kolom isian mengikuti template analis komponen yang dipilih.</CardDescription>
          </CardHeader>
          <CardContent>
            <div ref={picker} data-field="jenis" className={cn("grid gap-4 rounded-lg", errors.jenis && "ring-2 ring-destructive/40")}>
              {layers.map((layer) => (
                <div key={layer.code} className="grid gap-2">
                  <p className="eyebrow">{layer.label}</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {layer.jenis.map((k) => {
                      const c = jenisConfig[k];
                      const activeCard = values.jenis === k;
                      return (
                        <button
                          key={k}
                          type="button"
                          data-jenis
                          onClick={() => pickJenis(k)}
                          disabled={!!record && record.status !== "draft" && record.status !== "rejected"}
                          aria-pressed={activeCard}
                          style={{ ["--tone" as string]: `var(${c.tone})` }}
                          className={cn(
                            "relative overflow-hidden rounded-xl border bg-card px-3 py-2.5 text-left text-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card",
                            "before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-(--tone) before:opacity-60",
                            activeCard && "border-(--tone) bg-(--tone)/10 font-semibold before:opacity-100",
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
          <>
            <Card data-reveal>
              <CardHeader>
                <CardTitle className="section-title">Identitas</CardTitle>
                <CardDescription>
                  ID: <b className="tabular-nums">{record?.code ?? (values.rai ? `GSK-INF ${values.rai.slice(4)}.xxx (otomatis)` : "dibuat otomatis dari RAI")}</b>
                  {record && <ReviewBadge status={record.status} />}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  <Field data-field="name" data-invalid={!!errors.name || undefined} className="rounded-lg">
                    <FieldLabel htmlFor="name">{cfg.nameHeader}</FieldLabel>
                    <Input id="name" value={values.name} onChange={(e) => set("name", e.target.value)} placeholder={`mis. ${cfg.short === "Server" ? "Server Aplikasi DC-01" : cfg.label}`} aria-invalid={!!errors.name || undefined} />
                    <FieldError>{errors.name}</FieldError>
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field data-field="opd" data-invalid={!!errors.opd || undefined}>
                      <FieldLabel htmlFor="opd">Instansi</FieldLabel>
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
                      <Select value={values.period} onValueChange={(v) => setValues((c) => ({ ...c, period: v, relasi: [], aplikasi: [], data: [], probis: [] }))}>
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
                  <Field data-field="deskripsi" data-invalid={!!errors.deskripsi || undefined} className="rounded-lg">
                    <FieldLabel htmlFor="deskripsi">
                      Deskripsi {!cfg.common.includes("deskripsi") && <span className="font-normal text-muted-foreground">(opsional)</span>}
                    </FieldLabel>
                    <Textarea id="deskripsi" rows={2} value={values.deskripsi} onChange={(e) => set("deskripsi", e.target.value)} placeholder="Fungsi dan cakupan komponen" />
                    <FieldError>{errors.deskripsi}</FieldError>
                  </Field>
                  {(cfg.common.includes("pemilik") || cfg.common.includes("pengelola")) && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {cfg.common.includes("pemilik") && (
                        <Field data-field="pemilik" className="rounded-lg">
                          <FieldLabel htmlFor="pemilik">Nama pemilik</FieldLabel>
                          <Input id="pemilik" value={values.pemilik} onChange={(e) => set("pemilik", e.target.value)} placeholder="mis. Diskominfo, PT Telkom Indonesia" />
                        </Field>
                      )}
                      {cfg.common.includes("pengelola") && (
                        <Field data-field="pengelola" className="rounded-lg">
                          <FieldLabel htmlFor="pengelola">Unit pengelola</FieldLabel>
                          <Input id="pengelola" value={values.pengelola} onChange={(e) => set("pengelola", e.target.value)} placeholder="mis. Bidang Infrastruktur TIK" />
                        </Field>
                      )}
                    </div>
                  )}
                  {cfg.common.includes("kepemilikan") && (
                    <Field data-field="kepemilikan" className="rounded-lg">
                      <FieldLabel>Status kepemilikan</FieldLabel>
                      <Segmented label="Status kepemilikan" value={values.kepemilikan as InfraKepemilikan} onChange={(v) => set("kepemilikan", v)} options={[...kepemilikanOptions]} />
                    </Field>
                  )}
                </FieldGroup>
              </CardContent>
            </Card>

            <Card data-reveal>
              <CardHeader>
                <CardTitle className="section-title">Klasifikasi RAI</CardTitle>
                <CardDescription>Bawaan {cfg.label}: {cfg.rai}. Ubah bila perlu.</CardDescription>
              </CardHeader>
              <CardContent>
                <Field data-field="rai" data-invalid={!!errors.rai || undefined} className="rounded-lg">
                  <FieldLabel htmlFor="rai">RAI</FieldLabel>
                  <RefPicker id="rai" index={rai} labels={raiLabels} leafL2 value={values.rai || null} onChange={(code) => set("rai", code ?? "")} invalid={!!errors.rai} />
                  <FieldError>{errors.rai}</FieldError>
                </Field>
              </CardContent>
            </Card>

            {cfg.attrs.length > 0 && (
              <Card data-reveal>
                <CardHeader>
                  <CardTitle className="section-title">Spesifikasi</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {visibleAttrs.map((a) => (
                      <AttrInput key={a.key} attr={a} value={values.atribut[a.key] ?? ""} onChange={(v) => setAttr(a.key, v)} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card data-reveal>
              <CardHeader>
                <CardTitle className="section-title">Relasi</CardTitle>
                <CardDescription>Komponen dan entri domain lain pada periode {values.period}.</CardDescription>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  {allowedInfra.size > 0 && (
                    <Field data-field="relasi" data-invalid={!!errors.relasi || undefined} className="rounded-lg">
                      <FieldLabel>→ Komponen terkait</FieldLabel>
                      <LinkPicker noun="komponen" disabledText="Belum ada komponen lain" options={infraOptions} values={values.relasi} loading={loadingDeps} disabled={false} onChange={(v) => set("relasi", v)} />
                      <FieldDescription>{[...allowedInfra].map((k) => jenisConfig[k as InfraJenis].short).join(", ")}</FieldDescription>
                      <FieldError>{errors.relasi}</FieldError>
                    </Field>
                  )}
                  {(["aplikasi", "data", "probis"] as const)
                    .filter((k) => cfg.relasi.includes(k))
                    .map((k) => (
                      <Field key={k} data-field={k} data-invalid={!!errors[k] || undefined} className="rounded-lg">
                        <FieldLabel>{k === "aplikasi" ? "← Aplikasi" : k === "data" ? "Data dan informasi" : "→ Proses bisnis tervalidasi"}</FieldLabel>
                        <LinkPicker noun={k === "probis" ? "proses bisnis" : k} disabledText="Pilih periode dulu" options={options[k]} values={values[k]} loading={loadingDeps} disabled={false} onChange={(v) => set(k, v)} />
                        <FieldError>{errors[k]}</FieldError>
                      </Field>
                    ))}
                </FieldGroup>
              </CardContent>
            </Card>

            <Collapsible title="Keamanan SPBE" hint={`kegiatan keamanan tervalidasi periode ${values.period}`} filled={securityCount(values.security)}>
              <SecurityLinks arrow="→" period={values.period} value={values.security} onChange={(v) => set("security", v)} />
            </Collapsible>
          </>
        )}

        <div className="sticky bottom-3 z-20 flex flex-wrap items-center justify-end gap-2 rounded-2xl bg-card/90 p-3 shadow-raised backdrop-blur-md" data-reveal>
          <Button asChild variant="ghost" className="mr-auto">
            <Link href="/cms/infrastruktur">Batal</Link>
          </Button>
          <Button type="button" variant="outline" loading={saving && savingMode === "draft"} disabled={saving || !cfg} onClick={() => submit("draft")}>
            Simpan draf
          </Button>
          <Button type="button" loading={saving && savingMode === "submit"} disabled={saving || !cfg} onClick={() => submit("submit")}>
            {!(saving && savingMode === "submit") && <Icon icon={SentIcon} size={16} />}
            Ajukan verifikasi
          </Button>
        </div>
      </form>

      <Card ref={panel} data-reveal className="gap-4 xl:sticky xl:top-20">
        <CardHeader>
          <CardTitle className="section-title">Asisten AI</CardTitle>
          <CardDescription>Menebak komponen dari nama, menyusun deskripsi, menyarankan RAI, spesifikasi, dan komponen terkait.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Catatan tambahan (opsional), mis. firewall perimeter data center" aria-label="Catatan untuk AI" />
          <Button type="button" onClick={askAi} loading={thinking} className="group/ai">
            {!thinking && <Icon icon={AiMagicIcon} size={16} className="transition-transform duration-300 group-hover/ai:scale-125 group-hover/ai:rotate-12" />}
            Isi dengan AI
          </Button>
          {!values.name && <p className="text-xs text-muted-foreground">Isi nama komponen di kartu Identitas, atau pilih komponen dulu.</p>}

          {suggestion ? (
            <div className="grid gap-2.5">
              <div data-suggest className="flex items-center justify-between gap-2">
                <Badge variant={suggestion.source === "gemini" ? "info" : "muted"}>{suggestion.source === "gemini" ? "Gemini" : "Saran lokal"}</Badge>
                <Button type="button" size="sm" variant="outline" onClick={applyAll}>Pakai semua</Button>
              </div>
              {suggestion.jenis !== values.jenis && <SuggestItem label="Komponen" text={jenisConfig[suggestion.jenis].label} onApply={() => pickJenis(suggestion.jenis)} />}
              <SuggestItem label="Deskripsi" text={suggestion.deskripsi} onApply={() => apply("deskripsi", suggestion.deskripsi)} />
              {Object.keys(suggestion.atribut).length > 0 && (
                <SuggestItem
                  label="Spesifikasi"
                  text={Object.entries(suggestion.atribut)
                    .map(([k, v]) => `${jenisConfig[suggestion.jenis].attrs.find((a) => a.key === k)?.label ?? k}: ${v}`)
                    .join(" · ")}
                  onApply={() => setValues((v) => ({ ...v, atribut: { ...v.atribut, ...suggestion.atribut } }))}
                />
              )}
              {suggestion.rai.length > 0 && <PickList label="RAI" items={suggestion.rai} active={(c) => values.rai === c} name={(c) => rai.byCode.get(c)?.name ?? c} onPick={(c) => apply("rai", c)} />}
              {suggestion.relasi.length > 0 && (
                <PickList label="Komponen terkait" items={suggestion.relasi} active={(c) => values.relasi.includes(c)} name={nameOf} onPick={(c) => apply("relasi", [...new Set([...values.relasi, c])])} />
              )}
            </div>
          ) : (
            <Illustration name="data-center" className="mx-auto w-48 opacity-90" />
          )}
        </CardContent>
      </Card>

      <Dialog open={!!done} onOpenChange={(open) => !open && router.push("/cms/infrastruktur")}>
        <DialogContent className="text-center sm:max-w-sm">
          <Illustration name="success" loop={false} className="mx-auto w-32" />
          <DialogTitle>{done?.submitted ? "Komponen diajukan" : "Draf tersimpan"}</DialogTitle>
          <DialogDescription>{done?.submitted ? "Menunggu verifikasi Verifikator Infrastruktur Diskominfo." : `${values.name} — ${pdByCode.get(values.opd)?.name ?? ""}`}</DialogDescription>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <Button
              variant="outline"
              onClick={() => (record ? router.push(`/cms/infrastruktur/${record.id}`) : (setDone(null), setValues(fromRecord(null, values.jenis || null, lockedOpd, active)), setSuggestion(null)))}
            >
              {record ? "Tetap di sini" : "Tambah lagi"}
            </Button>
            <Button onClick={() => router.push("/cms/infrastruktur")}>
              <Icon icon={CheckmarkCircle02Icon} size={16} />
              Lihat daftar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Reveal>
  );
}

/** Satu kolom khusus: pilihan tetap (Select), teks panjang, atau teks. */
function AttrInput({ attr, value, onChange }: { attr: AttrField; value: string; onChange: (value: string) => void }) {
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
            {/* Nilai impor di luar pilihan tetap tetap ditampilkan agar tidak hilang. */}
            {[...attr.options!, ...(value && !attr.options!.includes(value) ? [value] : [])].map((o) => (
              <SelectItem key={o} value={o}>{o}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : attr.type === "textarea" ? (
        <Textarea id={id} rows={2} value={value} onChange={(e) => onChange(e.target.value)} placeholder={attr.placeholder} />
      ) : (
        <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={attr.placeholder} />
      )}
    </Field>
  );
}
