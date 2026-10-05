"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Add01Icon, Download04Icon } from "@hugeicons/core-free-icons";
import { DataTable } from "@/components/blocks/data-table";
import { EmptyState } from "@/components/blocks/empty-state";
import { FilterBar } from "@/components/blocks/filter-bar";
import { StatusBadge } from "@/components/blocks/status-badge";
import { DataDetail } from "@/components/cms/data/data-detail";
import { ReviewBadge } from "@/components/cms/review-badge";
import { useRadSet } from "@/components/data/rad-context";
import { Icon } from "@/components/icon";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { StatusTabs } from "@/components/cms/status-tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { jenisLabel, jenisOptions, sifatLabel, sifatOptions } from "@/lib/data/reference";
import { can, type Actor } from "@/lib/permissions";
import { perangkatDaerah, type PeriodOptions } from "@/lib/probis/reference";
import type { DataRecord, SubmissionStatus } from "@/lib/types";

type Tab = "all" | "review" | SubmissionStatus;

const tabs: { value: Tab; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "draft", label: "Draf" },
  { value: "submitted", label: "Diajukan" },
  { value: "verified", label: "Diverifikasi" },
  { value: "approved", label: "Disetujui" },
  { value: "rejected", label: "Dikembalikan" },
  { value: "review", label: "Perlu pemetaan RAD" },
];

/** Daftar data CMS: tab status, filter, tabel ramping (kolom inti), detail via pop-up. */
export function DataList({ rows, actor, periods }: { rows: DataRecord[]; actor: Actor; periods: PeriodOptions }) {
  const rads = useRadSet();
  /** Nama RAD mengikuti versi RAD periode masing-masing data. */
  const rad = (code: string | null, period: string) => (code ? rads.forPeriod(period).label(code) : "—");
  const [tab, setTab] = useState<Tab>("all");
  const [pd, setPd] = useState<string[]>([]);
  const [sifat, setSifat] = useState<string[]>([]);
  const [jenis, setJenis] = useState<string[]>([]);
  const [period, setPeriod] = useState<string>(periods.active);
  const [selected, setSelected] = useState<DataRecord | null>(null);

  /** Baris sesuai filter (tanpa tab status), dasar hitungan di tiap tab. */
  const scoped = useMemo(
    () => rows.filter((r) => (!pd.length || pd.includes(r.opdCode)) && (!sifat.length || sifat.includes(r.sifat)) && (!jenis.length || jenis.includes(r.jenis)) && r.period === period),
    [rows, pd, sifat, jenis, period],
  );
  const counts = useMemo(() => {
    const map = new Map<string, number>([["all", scoped.length]]);
    for (const r of scoped) {
      map.set(r.status, (map.get(r.status) ?? 0) + 1);
      if (r.radReview) map.set("review", (map.get("review") ?? 0) + 1);
    }
    return map;
  }, [scoped]);
  const visible = tab === "all" ? scoped : tab === "review" ? scoped.filter((r) => r.radReview) : scoped.filter((r) => r.status === tab);

  if (!rows.length) {
    return (
      <Card data-reveal>
        <EmptyState illustration="data-catalog" title="Belum ada data" description="Tambahkan satu per satu dengan bantuan AI, atau impor template Domain Arsitektur Data dan Informasi.">
          {can.create(actor) && (
            <Button asChild variant="teal">
              <Link href="/cms/data/baru">
                <Icon icon={Add01Icon} size={16} />
                Tambah data
              </Link>
            </Button>
          )}
          {can.import(actor) && (
            <Button asChild variant="outline">
              <Link href="/cms/data/impor">Impor template</Link>
            </Button>
          )}
        </EmptyState>
      </Card>
    );
  }

  return (
    <Reveal className="grid gap-4">
      <StatusTabs value={tab} onChange={setTab} counts={counts} tabs={tabs.filter((t) => t.value !== "review" || counts.get("review"))} />

      <FilterBar
        filters={[
          ...(can.readAll(actor) ? [{ label: "Wali data", wide: true, multiple: true, searchable: true, options: perangkatDaerah.map((p) => ({ value: p.code, label: p.name })), values: pd, onValuesChange: setPd }] : []),
          { label: "Sifat", multiple: true, options: sifatOptions, values: sifat, onValuesChange: setSifat },
          { label: "Jenis", multiple: true, options: jenisOptions, values: jenis, onValuesChange: setJenis },
          { label: "Periode", required: true, options: periods.periods, value: period, onChange: setPeriod },
        ]}
      />

      <DataTable
        title={tab === "all" ? "Semua status" : tabs.find((t) => t.value === tab)!.label}
        rows={visible}
        rowId={(r) => r.id}
        searchText={(r) => `${r.code} ${r.name} ${r.opdName} ${r.uraian}`}
        searchPlaceholder="Cari nama, ID, wali data, atau uraian"
        onRowClick={setSelected}
        pageSize={20}
        minWidth={900}
        actions={
          <>
            {can.export(actor) && (
              <Button asChild variant="outline">
                <a href="/api/export/data">
                  <Icon icon={Download04Icon} size={16} />
                  Ekspor
                </a>
              </Button>
            )}
            {can.create(actor) && (
              <Button asChild variant="teal">
                <Link href="/cms/data/baru">
                  <Icon icon={Add01Icon} size={16} />
                  Tambah
                </Link>
              </Button>
            )}
          </>
        }
        columns={[
          { header: "Status", sortValue: (r) => r.status, cell: (r) => <ReviewBadge status={r.status} /> },
          { header: "ID", className: "whitespace-nowrap", sortValue: (r) => r.code, cell: (r) => <span className="text-muted-foreground tabular-nums">{r.code}</span> },
          {
            header: "Nama data",
            sortValue: (r) => r.name,
            cell: (r) => (
              <span className="font-semibold">
                {r.name}
                {r.isSample && <Badge variant="muted" className="ml-2 align-middle">Contoh</Badge>}
                {r.radReview && <Badge variant="warning" className="ml-2 align-middle">Perlu pemetaan RAD</Badge>}
              </span>
            ),
          },
          { header: "Sifat", hideable: true, sortValue: (r) => r.sifat, cell: (r) => <StatusBadge status={sifatLabel[r.sifat]} /> },
          { header: "Wali data", hideable: true, sortValue: (r) => r.opdName, cell: (r) => r.opdName },
          { header: "RAD", hideable: true, sortValue: (r) => r.rad3 ?? r.rad2 ?? "", cell: (r) => <span className="text-muted-foreground">{rad(r.rad3 ?? r.rad2, r.period)}</span> },
          { header: "Jenis", hideable: true, defaultHidden: true, sortValue: (r) => r.jenis, cell: (r) => jenisLabel[r.jenis] },
          { header: "Validitas", hideable: true, defaultHidden: true, sortValue: (r) => r.validitas, cell: (r) => r.validitas },
          { header: "Interoperabel", hideable: true, defaultHidden: true, sortValue: (r) => Number(r.interoperabel), cell: (r) => (r.interoperabel ? "Ya" : "Tidak") },
          { header: "Uraian", hideable: true, defaultHidden: true, cell: (r) => <span className="line-clamp-2 text-muted-foreground">{r.uraian}</span> },
          { header: "Proses bisnis", hideable: true, defaultHidden: true, sortValue: (r) => r.probis.length, cell: (r) => (r.probis.length ? `${r.probis.length} probis` : "—") },
          { header: "Layanan", hideable: true, defaultHidden: true, sortValue: (r) => r.layanan.length, cell: (r) => (r.layanan.length ? `${r.layanan.length} layanan` : "—") },
        ]}
      />

      {selected && <DataDetail record={selected} actor={actor} onClose={() => setSelected(null)} />}
    </Reveal>
  );
}
