"use client";
import { useRef, useState, useTransition } from "react";
import { Add01Icon, Delete02Icon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { createPeriod, deletePeriod, setActivePeriod, setPeriodRefVersion } from "@/app/cms/actions";
import { Icon } from "@/components/icon";
import { MOTION_OK, gsap, useGSAP } from "@/components/motion/gsap";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Period } from "@/lib/probis/periods";
import type { RefKind } from "@/lib/reference/versioned";
import { cn } from "@/lib/utils";

const fmt = new Intl.NumberFormat("id-ID");

type Version = { id: string; name: string };

/** Referensi per periode: RAB untuk proses bisnis, RAL untuk layanan. */
const refs = {
  rab: { ref: "RAB", unit: "probis", list: "Daftar Probis", current: (p: Period) => p.versionId, used: (p: Period) => p.count },
  ral: { ref: "RAL", unit: "layanan", list: "Daftar Layanan", current: (p: Period) => p.ralVersionId, used: (p: Period) => p.services },
} as const;

/** Kelola periode arsitektur: tambah (2–5 tahun), jadikan aktif, pilih versi RAB & RAL, hapus periode kosong. */
export function PeriodManager({
  periods,
  min,
  max,
  versions,
}: {
  periods: Period[];
  min: number;
  max: number;
  /** Versi terbit yang bisa dipakai periode, per jenis referensi. */
  versions: Record<RefKind, Version[]>;
}) {
  const last = periods.at(-1);
  const [start, setStart] = useState(String((last?.end ?? new Date().getFullYear() - 1) + 1));
  const [end, setEnd] = useState(String(Number(start) + 4));
  const [fresh, setFresh] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [pending, start_] = useTransition();
  const list = useRef<HTMLUListElement>(null);

  useGSAP(
    () => {
      if (!fresh) return;
      gsap.matchMedia().add(MOTION_OK, () => {
        gsap.from(`[data-period="${fresh}"]`, { opacity: 0, y: -12, scale: 0.97, duration: 0.5, ease: "back.out(2)", clearProps: "all" });
      });
    },
    { dependencies: [fresh, periods.length], scope: list },
  );

  const span = Number(end) - Number(start) + 1;
  const spanOk = span >= min && span <= max;

  const add = () =>
    start_(async () => {
      const result = await createPeriod(Number(start), Number(end));
      if (!result.ok) return void toast.error(result.error);
      toast.success(`Periode ${result.data.name} ditambahkan`, { description: "Jadikan aktif bila sudah mulai dipakai." });
      setFresh(result.data.name);
      const next = Number(end) + 1;
      setStart(String(next));
      setEnd(String(next + 4));
    });

  const activate = (p: Period) =>
    start_(async () => {
      const result = await setActivePeriod(p.id);
      if (!result.ok) return void toast.error(result.error);
      toast.success(`Periode aktif: ${p.name}`, { description: "Form dan dashboard kini memakai periode ini secara bawaan." });
    });

  /** Pakai versi lain: RAB setiap probis / RAL setiap layanan periode ini dipetakan ulang otomatis. */
  const [switching, setSwitching] = useState<{ kind: RefKind; period: Period; versionId: string } | null>(null);
  const changeVersion = (kind: RefKind, p: Period, versionId: string) => {
    if (versionId === refs[kind].current(p)) return;
    if (refs[kind].used(p) > 0) return setSwitching({ kind, period: p, versionId });
    applyVersion(kind, p, versionId);
  };
  const applyVersion = (kind: RefKind, p: Period, versionId: string) => {
    const target = versions[kind].find((v) => v.id === versionId);
    if (!target) return;
    const r = refs[kind];
    setSwitching(null);
    start_(async () => {
      const result = await setPeriodRefVersion(kind, p.id, versionId);
      if (!result.ok) return void toast.error(result.error);
      const { mapped, review } = result.data;
      toast.success(`Periode ${p.name} memakai ${r.ref} ${target.name}`, {
        description: review ? `${fmt.format(mapped)} ${r.unit} dipetakan otomatis, ${fmt.format(review)} perlu dipetakan ulang (lihat ${r.list}).` : `${fmt.format(mapped)} ${r.unit} dipetakan otomatis.`,
      });
    });
  };

  const remove = (p: Period) =>
    start_(async () => {
      const result = await deletePeriod(p.id);
      setConfirm(null);
      if (!result.ok) return void toast.error(result.error);
      toast.success(`Periode ${p.name} dihapus`);
    });

  return (
    <Reveal className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
      <Card data-reveal className="gap-0 py-0">
        <ul ref={list} className="divide-y">
          {periods.map((p) => (
            <li key={p.id} data-period={p.name} className={cn("flex flex-wrap items-center gap-4 px-5 py-4 transition-colors", p.active && "bg-brand-teal/10")}>
              <div className="grid min-w-0 flex-1 gap-0.5">
                <p className="flex items-center gap-2 text-lg font-bold whitespace-nowrap tabular-nums">
                  {p.name}
                  {p.active && (
                    <Badge variant="success">Aktif</Badge>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {p.end - p.start + 1} tahun · {fmt.format(p.count)} proses bisnis · {fmt.format(p.services)} layanan
                </p>
              </div>
              <div className="grid gap-1.5">
                {(Object.keys(refs) as RefKind[]).map((kind) => (
                  <label key={kind} className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
                    Versi {refs[kind].ref}
                    <Select value={refs[kind].current(p) ?? undefined} onValueChange={(v) => changeVersion(kind, p, v)} disabled={pending}>
                      <SelectTrigger className="h-8 w-44 text-xs" aria-label={`Versi ${refs[kind].ref} periode ${p.name}`}>
                        <SelectValue placeholder="Pilih versi" />
                      </SelectTrigger>
                      <SelectContent>
                        {versions[kind].map((v) => (
                          <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                ))}
              </div>
              {!p.active && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={pending} onClick={() => activate(p)}>
                    Jadikan aktif
                  </Button>
                  <Button
                    variant={confirm === p.id ? "destructive" : "ghost"}
                    size="sm"
                    disabled={pending || p.count > 0 || p.services > 0}
                    onClick={() => (confirm === p.id ? remove(p) : setConfirm(p.id))}
                    onBlur={() => setConfirm(null)}
                  >
                    <Icon icon={Delete02Icon} size={14} />
                    {confirm === p.id ? "Yakin hapus?" : "Hapus"}
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <Card data-reveal className="xl:sticky xl:top-20">
        <CardHeader>
          <CardTitle className="section-title">Tambah periode</CardTitle>
          <CardDescription>Arsitektur di-versioning tiap {min}–{max} tahun, mengikuti perubahan SOTK.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor="start">Tahun mulai</FieldLabel>
              <Input
                id="start"
                type="number"
                inputMode="numeric"
                value={start}
                onChange={(e) => {
                  setStart(e.target.value);
                  if (e.target.value.length === 4) setEnd(String(Number(e.target.value) + 4));
                }}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="end">Tahun selesai</FieldLabel>
              <Input id="end" type="number" inputMode="numeric" value={end} onChange={(e) => setEnd(e.target.value)} aria-invalid={!spanOk || undefined} />
            </Field>
          </div>
          <FieldDescription className={cn(!spanOk && "text-destructive")}>
            {Number.isFinite(span) && span > 0 ? `Periode ${start}–${end} · ${span} tahun` : "Isi tahun mulai dan selesai"}
            {!spanOk && ` (harus ${min}–${max} tahun)`}
          </FieldDescription>
          <Button loading={pending} disabled={!spanOk} onClick={add}>
            {!pending && <Icon icon={Add01Icon} size={16} />}
            Tambah periode
          </Button>
        </CardContent>
      </Card>
      <Dialog open={!!switching} onOpenChange={(o) => !o && setSwitching(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Ganti versi {switching && refs[switching.kind].ref} periode {switching?.period.name}?
            </DialogTitle>
            {switching && (
              <DialogDescription>
                {refs[switching.kind].ref} {fmt.format(refs[switching.kind].used(switching.period))} {refs[switching.kind].unit} dipetakan ulang ke “
                {versions[switching.kind].find((v) => v.id === switching.versionId)?.name}” mengikuti asal-usul tiap {refs[switching.kind].ref}. Yang tidak punya padanan ditandai “Perlu pemetaan{" "}
                {refs[switching.kind].ref}”.
              </DialogDescription>
            )}
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSwitching(null)}>Batal</Button>
            <Button loading={pending} onClick={() => switching && applyVersion(switching.kind, switching.period, switching.versionId)}>Ganti & petakan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Reveal>
  );
}
