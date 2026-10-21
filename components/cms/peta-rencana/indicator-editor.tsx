"use client";
import { useMemo, useState, useTransition } from "react";
import { Add01Icon, Delete02Icon, FloppyDiskIcon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { deleteIndicator, saveIndicator } from "@/app/cms/peta-rencana/actions";
import { DataTable } from "@/components/blocks/data-table";
import { EmptyState } from "@/components/blocks/empty-state";
import { FilterBar } from "@/components/blocks/filter-bar";
import { Icon } from "@/components/icon";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { yearsOf } from "@/lib/peta-rencana/query";
import { inisiatifBySasaran } from "@/lib/peta-rencana/sasaran";
import { ikuBySasaran, sasaranStrategis, type PeriodOptions } from "@/lib/probis/reference";
import type { RencanaIndicator } from "@/lib/types";

type Draft = Omit<RencanaIndicator, "id" | "inisiatif"> & { id?: string; inisiatif: string };

/** Indikator sasaran dan target per tahun (tabel "Target Indikator Peta Rencana"), diubah lewat dialog. */
export function IndicatorEditor({ rows, periods, canManage }: { rows: RencanaIndicator[]; periods: PeriodOptions; canManage: boolean }) {
  const [period, setPeriod] = useState(periods.active);
  const [draft, setDraft] = useState<Draft | null>(null);
  const years = yearsOf(period);
  const visible = useMemo(() => rows.filter((r) => r.period === period), [rows, period]);

  const blank = (): Draft => ({ period, sasaran: "", inisiatif: "", indikator: "", targets: {} });

  return (
    <Reveal className="grid gap-4">
      <FilterBar filters={[{ label: "Periode", required: true, options: periods.periods, value: period, onChange: setPeriod }]} actions={undefined} />
      {visible.length ? (
        <DataTable
          title={`Periode ${period}`}
          rows={visible}
          rowId={(r) => r.id}
          searchText={(r) => `${r.sasaran} ${r.inisiatif ?? ""} ${r.indikator}`}
          searchPlaceholder="Cari sasaran atau indikator"
          onRowClick={canManage ? (r) => setDraft({ ...r, inisiatif: r.inisiatif ?? "" }) : undefined}
          minWidth={760}
          actions={
            canManage && (
              <Button variant="teal" onClick={() => setDraft(blank())}>
                <Icon icon={Add01Icon} size={16} />
                Tambah
              </Button>
            )
          }
          columns={[
            { header: "Indikator", sortValue: (r) => r.indikator, cell: (r) => <span className="font-semibold">{r.indikator}</span> },
            { header: "Sasaran", hideable: true, sortValue: (r) => r.sasaran, cell: (r) => <span className="line-clamp-2 text-muted-foreground">{r.sasaran}</span> },
            ...years.map((y) => ({ header: y, className: "text-right tabular-nums whitespace-nowrap", cell: (r: RencanaIndicator) => r.targets[y] ?? "—" })),
          ]}
        />
      ) : (
        <Card data-reveal>
          <EmptyState illustration="roadmap" title="Belum ada indikator di periode ini" description="Tambahkan indikator sasaran beserta target tiap tahun.">
            {canManage && (
              <Button variant="teal" onClick={() => setDraft(blank())}>
                <Icon icon={Add01Icon} size={16} />
                Tambah indikator
              </Button>
            )}
          </EmptyState>
        </Card>
      )}
      {draft && <IndicatorDialog draft={draft} periods={periods.periods} onClose={() => setDraft(null)} />}
    </Reveal>
  );
}

function IndicatorDialog({ draft, periods, onClose }: { draft: Draft; periods: string[]; onClose: () => void }) {
  const [values, setValues] = useState(draft);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const years = yearsOf(values.period);

  const pickSasaran = (sasaran: string) => {
    const i = sasaranStrategis.indexOf(sasaran);
    setValues((v) => ({ ...v, sasaran, inisiatif: v.inisiatif || inisiatifBySasaran[i] || "", indikator: v.indikator || ikuBySasaran[i] || "" }));
  };

  const save = () =>
    start(async () => {
      const result = await saveIndicator(values);
      if (!result.ok) {
        setErrors(result.fields ?? {});
        return void toast.error(result.error);
      }
      toast.success("Indikator tersimpan", { description: values.indikator });
      onClose();
    });

  const remove = () =>
    start(async () => {
      const result = await deleteIndicator(values.id!);
      if (!result.ok) return void toast.error(result.error);
      toast.success("Indikator dihapus", { description: values.indikator });
      onClose();
    });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[88svh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{values.id ? "Ubah indikator" : "Indikator baru"}</DialogTitle>
          <DialogDescription>Target diisi per tahun periode; boleh berupa rentang, mis. 71,67–72,50.</DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
            <Field>
              <FieldLabel htmlFor="ind-period">Periode</FieldLabel>
              <Select value={values.period} onValueChange={(period) => setValues((v) => ({ ...v, period }))}>
                <SelectTrigger id="ind-period" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {periods.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field data-invalid={!!errors.sasaran || undefined}>
              <FieldLabel htmlFor="ind-sasaran">Sasaran strategis</FieldLabel>
              <Select value={values.sasaran || undefined} onValueChange={pickSasaran}>
                <SelectTrigger id="ind-sasaran" className="w-full min-w-0 [&>span]:truncate">
                  <SelectValue placeholder="Pilih sasaran" />
                </SelectTrigger>
                <SelectContent className="max-w-[min(40rem,90vw)]">
                  {sasaranStrategis.map((s) => (
                    <SelectItem key={s} value={s} className="whitespace-normal">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError>{errors.sasaran}</FieldError>
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="ind-inisiatif">Inisiatif strategis</FieldLabel>
            <Input id="ind-inisiatif" value={values.inisiatif} onChange={(e) => setValues((v) => ({ ...v, inisiatif: e.target.value }))} />
          </Field>
          <Field data-invalid={!!errors.indikator || undefined}>
            <FieldLabel htmlFor="ind-name">Indikator</FieldLabel>
            <Input id="ind-name" value={values.indikator} onChange={(e) => setValues((v) => ({ ...v, indikator: e.target.value }))} placeholder="mis. Harapan Lama Sekolah" />
            <FieldError>{errors.indikator}</FieldError>
          </Field>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {years.map((y) => (
              <Field key={y}>
                <FieldLabel htmlFor={`t-${y}`}>{y}</FieldLabel>
                <Input id={`t-${y}`} value={values.targets[y] ?? ""} onChange={(e) => setValues((v) => ({ ...v, targets: { ...v.targets, [y]: e.target.value } }))} className="tabular-nums" />
              </Field>
            ))}
          </div>
        </FieldGroup>
        <DialogFooter className="gap-2">
          {values.id && (
            <Button variant={confirm ? "destructive" : "ghost"} className="sm:mr-auto" disabled={busy} onClick={() => (confirm ? remove() : setConfirm(true))} onBlur={() => setConfirm(false)}>
              <Icon icon={Delete02Icon} size={16} />
              {confirm ? "Klik lagi untuk menghapus" : "Hapus"}
            </Button>
          )}
          <Button loading={busy} onClick={save}>
            {!busy && <Icon icon={FloppyDiskIcon} size={16} />}
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
