"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Add01Icon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { createOpd, saveOpdPeriod } from "@/app/cms/actions";
import { DataTable } from "@/components/blocks/data-table";
import { Icon } from "@/components/icon";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatNumber } from "@/lib/format";
import type { OpdPeriodRow } from "@/lib/opd/repo";

type PeriodRef = { id: string; name: string; active: boolean };
type Editing = { id: string | null; code: string; name: string; active: boolean; records: number };

/** Nama dan keberlakuan Perangkat Daerah per periode arsitektur (SOTK berubah antarperiode). */
export function OpdManager({ periods, period, rows }: { periods: PeriodRef[]; period: PeriodRef; rows: OpdPeriodRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [pending, start] = useTransition();
  const isNew = editing?.id === null;

  const save = () => {
    if (!editing) return;
    start(async () => {
      const result = editing.id ? await saveOpdPeriod(period.id, editing.id, editing.name, editing.active) : await createOpd(period.id, editing.code, editing.name);
      if (!result.ok) return void toast.error(result.error);
      toast.success(isNew ? `${editing.name} ditambahkan` : `${editing.name} disimpan`, { description: `Periode ${period.name}` });
      setEditing(null);
      router.refresh();
    });
  };

  return (
    <Reveal className="grid gap-4">
      <DataTable
        title={`${formatNumber(rows.filter((r) => r.active).length)} berlaku`}
        rows={rows}
        rowId={(r) => r.id}
        searchText={(r) => `${r.code} ${r.name}`}
        searchPlaceholder="Cari nama atau kode"
        onRowClick={(r) => setEditing({ ...r })}
        pageSize={40}
        minWidth={640}
        actions={
          <>
            <Select value={period.id} onValueChange={(id) => router.replace(`/cms/pengaturan/opd?periode=${encodeURIComponent(periods.find((p) => p.id === id)!.name)}`)}>
              <SelectTrigger className="w-40" aria-label="Periode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {periods.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}{p.active ? " · aktif" : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="teal" onClick={() => setEditing({ id: null, code: "", name: "", active: true, records: 0 })}>
              <Icon icon={Add01Icon} size={16} />
              Tambah
            </Button>
          </>
        }
        columns={[
          { header: "Kode", className: "whitespace-nowrap", sortValue: (r) => r.code, cell: (r) => <span className="text-muted-foreground tabular-nums">{r.code}</span> },
          { header: "Nama pada periode ini", sortValue: (r) => r.name, cell: (r) => <span className="font-semibold">{r.name}</span> },
          { header: "Status", sortValue: (r) => Number(r.active), cell: (r) => <Badge variant={r.active ? "success" : "muted"}>{r.active ? "Berlaku" : "Tidak berlaku"}</Badge> },
          { header: "Isian", className: "text-right", sortValue: (r) => r.records, cell: (r) => <span className="tabular-nums">{formatNumber(r.records)}</span> },
        ]}
      />

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isNew ? "Tambah Perangkat Daerah" : editing?.code}</DialogTitle>
            <DialogDescription>Periode {period.name}. Periode lain tidak berubah.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="grid gap-4">
              {isNew && (
                <Field>
                  <FieldLabel htmlFor="opd-code">Kode</FieldLabel>
                  <Input id="opd-code" value={editing.code} maxLength={20} autoCapitalize="characters" onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })} />
                  <FieldDescription>Huruf kapital dan angka, tidak dapat diubah setelah disimpan.</FieldDescription>
                </Field>
              )}
              <Field>
                <FieldLabel htmlFor="opd-name">Nama</FieldLabel>
                <Input id="opd-name" value={editing.name} maxLength={160} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </Field>
              {!isNew && (
                <label className="flex items-start gap-3 text-sm">
                  <Checkbox className="mt-0.5" checked={editing.active} onCheckedChange={(v) => setEditing({ ...editing, active: v === true })} />
                  <span>
                    Berlaku pada periode ini
                    {!editing.active && editing.records > 0 && (
                      <span className="block text-xs text-muted-foreground">{formatNumber(editing.records)} isian tetap tersimpan; OPD ini hanya tidak bisa dipilih untuk isian baru.</span>
                    )}
                  </span>
                </label>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Batal</Button>
            <Button loading={pending} disabled={!editing?.name.trim() || (isNew && editing.code.length < 2)} onClick={save}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Reveal>
  );
}
