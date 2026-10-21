"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveGapAction } from "@/app/cms/gap-analysis/actions";
import { Segmented } from "@/components/blocks/segmented";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { priorityConfig, priorityKeys, type GapPriority } from "@/lib/gap/rules";
import type { GapInput } from "@/lib/gap/schema";
import { muatanOptions, type Muatan } from "@/lib/peta-rencana/muatan";
import { perangkatDaerah, sasaranStrategis } from "@/lib/probis/reference";
import type { GapRecord } from "@/lib/types";

/** Dialog temuan manual (mis. kebutuhan SDM, kapasitas server) atau penyesuaian temuan otomatis. */
export function GapForm({ gap, period, periods, onClose }: { gap: GapRecord | null; period: string; periods: string[]; onClose: () => void }) {
  const [values, setValues] = useState({
    period: gap?.period ?? period,
    opd: perangkatDaerah.find((p) => p.name === gap?.opdName)?.code ?? "",
    domain: (gap?.domain ?? "manajemen") as Muatan,
    subjectName: gap?.subjectName ?? "",
    sasaran: gap?.sasaran ?? "",
    asIs: gap?.asIs ?? "",
    target: gap?.target ?? "",
    rekomendasi: gap?.rekomendasi ?? "",
    priority: (gap?.priority ?? "sedang") as GapPriority,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, start] = useTransition();
  const automatic = !!gap?.rule;
  const set = <K extends keyof typeof values>(key: K, value: (typeof values)[K]) => (setValues((v) => ({ ...v, [key]: value })), setErrors((e) => ({ ...e, [key]: "" })));

  const save = () =>
    start(async () => {
      const result = await saveGapAction(values as GapInput, { id: gap?.id });
      if (!result.ok) {
        setErrors(result.fields ?? {});
        return void toast.error(result.error);
      }
      toast.success(gap ? "Temuan diperbarui" : "Temuan ditambahkan", { description: values.subjectName });
      onClose();
    });

  const text = (key: "subjectName" | "asIs" | "target" | "rekomendasi", label: string, placeholder: string, area = false) => (
    <Field data-invalid={!!errors[key] || undefined}>
      <FieldLabel htmlFor={`g-${key}`}>{label}</FieldLabel>
      {area ? (
        <Textarea id={`g-${key}`} rows={2} value={values[key]} onChange={(e) => set(key, e.target.value)} placeholder={placeholder} />
      ) : (
        <Input id={`g-${key}`} value={values[key]} onChange={(e) => set(key, e.target.value)} placeholder={placeholder} disabled={automatic && key === "subjectName"} />
      )}
      <FieldError>{errors[key]}</FieldError>
    </Field>
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[88svh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{gap ? "Ubah temuan" : "Temuan manual"}</DialogTitle>
          <DialogDescription>{automatic ? "Kondisi AS-IS diperbarui lagi saat pemindaian berikutnya." : "Untuk kesenjangan yang tidak terdeteksi otomatis, mis. SDM atau kapasitas."}</DialogDescription>
        </DialogHeader>
        <FieldGroup>
          {text("subjectName", "Objek", "mis. SDM pengelola keamanan siber")}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="g-domain">Domain</FieldLabel>
              <Select value={values.domain} onValueChange={(v) => set("domain", v as Muatan)} disabled={automatic}>
                <SelectTrigger id="g-domain" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {muatanOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="g-period">Periode</FieldLabel>
              <Select value={values.period} onValueChange={(v) => set("period", v)} disabled={automatic}>
                <SelectTrigger id="g-period" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {periods.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="g-opd">Perangkat daerah</FieldLabel>
            <Select value={values.opd || undefined} onValueChange={(v) => set("opd", v)}>
              <SelectTrigger id="g-opd" className="w-full min-w-0 [&>span]:truncate">
                <SelectValue placeholder="Opsional" />
              </SelectTrigger>
              <SelectContent>
                {perangkatDaerah.map((p) => (
                  <SelectItem key={p.code} value={p.code}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            {text("asIs", "Kondisi saat ini (AS-IS)", "mis. Baru 1 pegawai bersertifikat keamanan", true)}
            {text("target", "Kondisi target", "mis. Minimal 3 pegawai bersertifikat", true)}
          </div>
          {text("rekomendasi", "Rekomendasi", "mis. Sertifikasi keamanan siber bagi pranata komputer")}
          <Field>
            <FieldLabel htmlFor="g-sasaran">Sasaran strategis</FieldLabel>
            <Select value={values.sasaran || undefined} onValueChange={(v) => set("sasaran", v)}>
              <SelectTrigger id="g-sasaran" className="w-full min-w-0 [&>span]:truncate">
                <SelectValue placeholder="Opsional" />
              </SelectTrigger>
              <SelectContent className="max-w-[min(38rem,90vw)]">
                {sasaranStrategis.map((s) => (
                  <SelectItem key={s} value={s} className="whitespace-normal">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Segmented label="Prioritas" value={values.priority} onChange={(v) => set("priority", v)} options={priorityKeys.map((k) => ({ value: k, label: priorityConfig[k].label }))} />
        </FieldGroup>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button loading={busy} onClick={save}>Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
