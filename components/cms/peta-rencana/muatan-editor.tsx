"use client";
import { useState, useTransition } from "react";
import { Add01Icon, Delete02Icon, FloppyDiskIcon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { deleteMuatanAction, saveMuatanAction } from "@/app/cms/peta-rencana/actions";
import { ToneBadge } from "@/components/blocks/status-badge";
import { Icon } from "@/components/icon";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { muatanTones, type MuatanDef } from "@/lib/peta-rencana/muatan";
import { cn } from "@/lib/utils";

type Draft = MuatanDef & { isNew?: boolean };

/** Kelola daftar muatan kegiatan Peta Rencana: tambah, ubah nama/singkatan/warna, hapus bila belum dipakai. */
export function MuatanEditor({ list, usage }: { list: MuatanDef[]; usage: Record<string, number> }) {
  const [draft, setDraft] = useState<Draft | null>(null);
  return (
    <Reveal className="grid gap-4">
      <Card data-reveal>
        <CardHeader>
          <CardTitle as="h2" className="section-title">Muatan</CardTitle>
          <CardDescription>Fokus arsitektur yang bisa dipilih pada kegiatan. Singkatan menjadi bagian ID otomatis (GSK-PRN APL.001).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {list.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setDraft(m)}
                style={{ ["--tone" as string]: `var(${m.tone})` }}
                className="relative overflow-hidden rounded-xl border bg-card px-3 py-2.5 text-left text-sm transition-all duration-200 before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-(--tone) hover:-translate-y-0.5 hover:shadow-card"
              >
                <span className="block font-semibold">{m.label}</span>
                <span className="text-xs text-muted-foreground">{m.abbr} · {usage[m.key] ?? 0} kegiatan</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setDraft({ key: "", label: "", abbr: "", tone: muatanTones[0].value, isNew: true })}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
            >
              <Icon icon={Add01Icon} size={16} />
              Tambah muatan
            </button>
          </div>
        </CardContent>
      </Card>
      {draft && <MuatanDialog draft={draft} used={usage[draft.key] ?? 0} onClose={() => setDraft(null)} />}
    </Reveal>
  );
}

function MuatanDialog({ draft, used, onClose }: { draft: Draft; used: number; onClose: () => void }) {
  const [values, setValues] = useState(draft);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const set = (patch: Partial<MuatanDef>) => {
    setValues((v) => ({ ...v, ...patch }));
    setErrors({});
  };

  const save = () =>
    start(async () => {
      const result = await saveMuatanAction({ key: draft.isNew ? undefined : values.key, label: values.label, abbr: values.abbr, tone: values.tone });
      if (!result.ok) {
        setErrors(result.fields ?? {});
        return void toast.error(result.error);
      }
      toast.success(draft.isNew ? "Muatan ditambahkan" : "Muatan tersimpan", { description: values.label });
      onClose();
    });

  const remove = () =>
    start(async () => {
      const result = await deleteMuatanAction(values.key);
      if (!result.ok) return void toast.error(result.error);
      toast.success("Muatan dihapus", { description: values.label });
      onClose();
    });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{draft.isNew ? "Muatan baru" : "Ubah muatan"}</DialogTitle>
          <DialogDescription>{draft.isNew ? "Tambahkan fokus arsitektur baru." : `${used} kegiatan memakai muatan ini.`}</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => (e.preventDefault(), save())} noValidate>
          <FieldGroup>
            <Field data-invalid={!!errors.label || undefined}>
              <FieldLabel htmlFor="muatan-label">Nama</FieldLabel>
              <Input id="muatan-label" value={values.label} onChange={(e) => set({ label: e.target.value })} placeholder="mis. Inovasi" aria-invalid={!!errors.label || undefined} autoFocus />
              <FieldError>{errors.label}</FieldError>
            </Field>
            <Field data-invalid={!!errors.abbr || undefined}>
              <FieldLabel htmlFor="muatan-abbr">Singkatan ID</FieldLabel>
              <Input id="muatan-abbr" value={values.abbr} onChange={(e) => set({ abbr: e.target.value.toUpperCase() })} maxLength={5} placeholder="INO" className="uppercase" aria-invalid={!!errors.abbr || undefined} />
              <FieldDescription>{used ? "Mengubah singkatan hanya memengaruhi ID kegiatan baru." : "2–5 huruf/angka, unik."}</FieldDescription>
              <FieldError>{errors.abbr}</FieldError>
            </Field>
            <Field>
              <FieldLabel>Warna</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {muatanTones.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    aria-label={t.label}
                    aria-pressed={values.tone === t.value}
                    onClick={() => set({ tone: t.value })}
                    style={{ background: `var(${t.value})` }}
                    className={cn("size-7 rounded-full border-2 border-transparent transition-transform hover:scale-110", values.tone === t.value && "border-foreground")}
                  />
                ))}
              </div>
              <div className="pt-1">
                <ToneBadge tone={values.tone}>{values.label || "Pratinjau"}</ToneBadge>
              </div>
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-4 gap-2">
            {!draft.isNew && (
              <Button
                type="button"
                variant={confirm ? "destructive" : "ghost"}
                className="sm:mr-auto"
                disabled={busy || used > 0}
                title={used ? "Masih dipakai kegiatan" : undefined}
                onClick={() => (confirm ? remove() : setConfirm(true))}
                onBlur={() => setConfirm(false)}
              >
                <Icon icon={Delete02Icon} size={16} />
                {confirm ? "Klik lagi untuk menghapus" : "Hapus"}
              </Button>
            )}
            <Button type="submit" loading={busy}>
              {!busy && <Icon icon={FloppyDiskIcon} size={16} />}
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
