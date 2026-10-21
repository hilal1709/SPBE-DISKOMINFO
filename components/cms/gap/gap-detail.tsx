"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowRight02Icon, Delete02Icon, PencilEdit02Icon, Route01Icon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { deleteGapAction, proposeGapAction, setGapStatusAction } from "@/app/cms/gap-analysis/actions";
import { DetailDialog, DetailField } from "@/components/blocks/detail-dialog";
import { StatusBadge, ToneBadge } from "@/components/blocks/status-badge";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { gapStatusConfig, priorityConfig, ruleConfig, type GapRule } from "@/lib/gap/rules";
import { muatanConfig, statusConfig } from "@/lib/peta-rencana/muatan";
import { yearsOf } from "@/lib/peta-rencana/query";
import { inisiatifBySasaran } from "@/lib/peta-rencana/sasaran";
import type { RencanaInput } from "@/lib/peta-rencana/schema";
import { perangkatDaerah, sasaranStrategis } from "@/lib/probis/reference";
import type { GapRecord } from "@/lib/types";

export const GapStatus = ({ status }: { status: GapRecord["status"] }) => <ToneBadge tone={gapStatusConfig[status].tone}>{gapStatusConfig[status].label}</ToneBadge>;
export const GapPriority = ({ priority }: { priority: GapRecord["priority"] }) => <ToneBadge tone={priorityConfig[priority].tone}>{priorityConfig[priority].label}</ToneBadge>;

/** Pop-up temuan: AS-IS → target berdampingan, rekomendasi, lalu aksi tindak lanjut sesuai status. */
export function GapDetail({ gap, canManage, onEdit, onClose }: { gap: GapRecord; canManage: boolean; onEdit: () => void; onClose: () => void }) {
  const [busy, start] = useTransition();
  const [ignoring, setIgnoring] = useState(false);
  const [note, setNote] = useState("");
  const [proposing, setProposing] = useState(false);
  const rule = gap.rule ? ruleConfig[gap.rule as GapRule] : null;

  const setStatus = (status: "terbuka" | "diabaikan") =>
    start(async () => {
      const result = await setGapStatusAction(gap.id, status, note);
      if (!result.ok) return void toast.error(result.error);
      toast.success(status === "diabaikan" ? "Temuan diabaikan" : "Temuan dibuka kembali", { description: gap.subjectName });
      onClose();
    });

  const remove = () =>
    start(async () => {
      const result = await deleteGapAction(gap.id);
      if (!result.ok) return void toast.error(result.error);
      toast.success("Temuan dihapus", { description: gap.subjectName });
      onClose();
    });

  return (
    <>
      <DetailDialog
        open={!proposing}
        onOpenChange={(open) => !open && onClose()}
        eyebrow={`${gap.code}${gap.subjectCode ? ` · ${gap.subjectCode}` : ""}`}
        title={gap.subjectName}
        meta={
          <>
            <GapStatus status={gap.status} />
            <GapPriority priority={gap.priority} />
            <ToneBadge tone={muatanConfig[gap.domain].tone}>{muatanConfig[gap.domain].label}</ToneBadge>
            <Badge variant="muted">{rule ? rule.label : "Temuan manual"}</Badge>
            {gap.opdName && <Badge variant="muted">{gap.opdName}</Badge>}
          </>
        }
      >
        <div className="grid items-stretch gap-2 sm:grid-cols-[1fr_auto_1fr]">
          <div className="rounded-xl border border-brand-orange/50 bg-brand-orange/10 p-3">
            <p className="eyebrow">Kondisi saat ini (AS-IS)</p>
            <p className="mt-1 text-sm font-medium">{gap.asIs}</p>
          </div>
          <span className="grid place-items-center text-muted-foreground" aria-hidden>
            <Icon icon={ArrowRight02Icon} size={20} className="rotate-90 sm:rotate-0" />
          </span>
          <div className="rounded-xl border border-brand-teal/50 bg-brand-teal/10 p-3">
            <p className="eyebrow">Kondisi target</p>
            <p className="mt-1 text-sm font-medium">{gap.target}</p>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <DetailField label="Rekomendasi" value={gap.rekomendasi} className="sm:col-span-2" />
          {gap.sasaran && <DetailField label="Sasaran strategis terkait" value={gap.sasaran} className="sm:col-span-2" />}
          <DetailField label="Periode" value={gap.period} />
          {gap.roadmapCode && (
            <DetailField
              label="Kegiatan Peta Rencana"
              value={
                <span className="flex flex-wrap items-center gap-2">
                  {gap.roadmapCode}
                  {gap.roadmapStatus && <StatusBadge status={statusConfig[gap.roadmapStatus].label} />}
                </span>
              }
            />
          )}
          {gap.note && <DetailField label="Catatan" value={gap.note} className="sm:col-span-2" />}
        </div>

        {canManage && (
          <div className="grid gap-3 border-t pt-4">
            {ignoring && <Textarea autoFocus rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Alasan diabaikan, mis. sudah ditangani aplikasi nasional" aria-label="Alasan diabaikan" />}
            <div className="flex flex-wrap gap-2">
              {gap.status === "terbuka" && (
                <Button onClick={() => setProposing(true)} disabled={busy}>
                  <Icon icon={Route01Icon} size={16} />
                  Jadikan usulan Peta Rencana
                </Button>
              )}
              {gap.status === "terbuka" && (
                <Button variant="outline" loading={busy && ignoring} onClick={() => (ignoring ? setStatus("diabaikan") : setIgnoring(true))}>
                  {ignoring ? "Simpan & abaikan" : "Abaikan"}
                </Button>
              )}
              {gap.status === "diabaikan" && (
                <Button variant="outline" loading={busy} onClick={() => setStatus("terbuka")}>
                  Buka kembali
                </Button>
              )}
              {gap.roadmapId && (
                <Button asChild variant="outline">
                  <Link href={`/cms/peta-rencana/${gap.roadmapId}`}>Buka kegiatan</Link>
                </Button>
              )}
              <Button variant="ghost" className="ml-auto" onClick={onEdit} disabled={busy}>
                <Icon icon={PencilEdit02Icon} size={16} />
                Ubah
              </Button>
              {!gap.rule && (
                <Button variant="ghost" className="text-destructive" onClick={remove} disabled={busy}>
                  <Icon icon={Delete02Icon} size={16} />
                  Hapus
                </Button>
              )}
            </div>
          </div>
        )}
      </DetailDialog>
      {proposing && <ProposeDialog gap={gap} onClose={() => setProposing(false)} onDone={onClose} />}
    </>
  );
}

/** Dialog usulan: isian kegiatan Peta Rencana yang sudah diisi dari temuan (muatan, PD, sasaran, nama, target). */
function ProposeDialog({ gap, onClose, onDone }: { gap: GapRecord; onClose: () => void; onDone: () => void }) {
  const years = yearsOf(gap.period);
  const thisYear = String(new Date().getFullYear());
  const sasaran = gap.sasaran && sasaranStrategis.includes(gap.sasaran) ? gap.sasaran : "";
  const [values, setValues] = useState({
    year: years.find((y) => y > thisYear) ?? years.at(-1) ?? "",
    sasaran,
    opd: perangkatDaerah.find((p) => p.name === gap.opdName)?.code ?? "",
    name: gap.rekomendasi,
    program: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, start] = useTransition();
  const set = (key: keyof typeof values, value: string) => (setValues((v) => ({ ...v, [key]: value })), setErrors((e) => ({ ...e, [key]: "" })));

  const save = () =>
    start(async () => {
      const input: RencanaInput = {
        ...values,
        period: gap.period,
        muatan: gap.domain,
        inisiatif: inisiatifBySasaran[sasaranStrategis.indexOf(values.sasaran)] ?? undefined,
        target: gap.target,
        status: "direncanakan",
      };
      const result = await proposeGapAction(gap.id, input);
      if (!result.ok) {
        setErrors(result.fields ?? {});
        return void toast.error(result.error);
      }
      toast.success("Diusulkan ke Peta Rencana", { description: `${values.name} · ${values.year}` });
      onDone();
    });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[88svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Usulan kegiatan Peta Rencana</DialogTitle>
          <DialogDescription>{gap.code} · muatan {muatanConfig[gap.domain].label}</DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field data-invalid={!!errors.name || undefined}>
            <FieldLabel htmlFor="p-name">Kegiatan</FieldLabel>
            <Input id="p-name" value={values.name} onChange={(e) => set("name", e.target.value)} />
            <FieldError>{errors.name}</FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="p-program">Program</FieldLabel>
            <Input id="p-program" value={values.program} onChange={(e) => set("program", e.target.value)} placeholder="Opsional" />
          </Field>
          <Field data-invalid={!!errors.sasaran || undefined}>
            <FieldLabel htmlFor="p-sasaran">Sasaran strategis</FieldLabel>
            <Select value={values.sasaran || undefined} onValueChange={(v) => set("sasaran", v)}>
              <SelectTrigger id="p-sasaran" className="w-full min-w-0 [&>span]:truncate">
                <SelectValue placeholder="Pilih sasaran" />
              </SelectTrigger>
              <SelectContent className="max-w-[min(36rem,90vw)]">
                {sasaranStrategis.map((s) => (
                  <SelectItem key={s} value={s} className="whitespace-normal">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError>{errors.sasaran}</FieldError>
          </Field>
          <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
            <Field data-invalid={!!errors.opd || undefined}>
              <FieldLabel htmlFor="p-opd">Perangkat daerah</FieldLabel>
              <Select value={values.opd || undefined} onValueChange={(v) => set("opd", v)}>
                <SelectTrigger id="p-opd" className="w-full min-w-0 [&>span]:truncate">
                  <SelectValue placeholder="Pilih PD" />
                </SelectTrigger>
                <SelectContent>
                  {perangkatDaerah.map((p) => (
                    <SelectItem key={p.code} value={p.code}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError>{errors.opd}</FieldError>
            </Field>
            <Field data-invalid={!!errors.year || undefined}>
              <FieldLabel htmlFor="p-year">Tahun</FieldLabel>
              <Select value={values.year} onValueChange={(v) => set("year", v)}>
                <SelectTrigger id="p-year" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError>{errors.year}</FieldError>
            </Field>
          </div>
        </FieldGroup>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button loading={busy} onClick={save}>Usulkan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
