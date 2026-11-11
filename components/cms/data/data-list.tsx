"use client";
import Link from "next/link";
import { matchesCmsPeriod } from "@/lib/cms/list-navigation";
import { useListFilters } from "@/components/cms/use-list-filters";
import { useMemo, useState } from "react";
import { Add01Icon, Download04Icon } from "@hugeicons/core-free-icons";
import { DataTable } from "@/components/blocks/data-table";
import { EmptyState } from "@/components/blocks/empty-state";
import { FilterBar } from "@/components/blocks/filter-bar";
import { StatusBadge } from "@/components/blocks/status-badge";
import { DataDetail } from "@/components/cms/data/data-detail";
import { ReviewBadge } from "@/components/cms/review-badge";
import { clamp, links, securityColumns } from "@/components/cms/template-cells";
import { useRadSet } from "@/components/data/rad-context";
import { Icon } from "@/components/icon";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { StatusTabs } from "@/components/cms/status-tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { jenisLabel, jenisOptions, sifatLabel, sifatOptions } from "@/lib/data/reference";
import { can, type Actor } from "@/lib/permissions";
import { type PeriodOptions } from "@/lib/probis/reference";
import { useOpd } from "@/components/opd/opd-context";
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
  const opd = useOpd();
  const rads = useRadSet();
  /** Nama RAD mengikuti versi RAD periode masing-masing data. */
  const rad = (code: string | null, period: string) => (code ? rads.forPeriod(period).label(code) : "—");
  const { tab, setTab, period, setPeriod } = useListFilters();
  const [pd, setPd] = useState<string[]>([]);
  const [sifat, setSifat] = useState<string[]>([]);
  const [jenis, setJenis] = useState<string[]>([]);
  const [selected, setSelected] = useState<DataRecord | null>(null);

  /** Baris sesuai filter (tanpa tab status), dasar hitungan di tiap tab. */
  const scoped = useMemo(
    () => rows.filter((r) => (!pd.length || pd.includes(r.opdCode)) && (!sifat.length || sifat.includes(r.sifat)) && (!jenis.length || jenis.includes(r.jenis)) && matchesCmsPeriod(r.period, period)),
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
          ...(can.readAll(actor) ? [{ label: "Wali data", wide: true, multiple: true, searchable: true, options: opd.all().map((p) => ({ value: p.code, label: p.name })), values: pd, onValuesChange: setPd }] : []),
          { label: "Sifat", multiple: true, options: sifatOptions, values: sifat, onValuesChange: setSifat },
          { label: "Jenis", multiple: true, options: jenisOptions, values: jenis, onValuesChange: setJenis },
          { label: "Periode", options: periods.periods, value: period, onChange: setPeriod },
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
          { header: "ID", className: "whitespace-nowrap", sortValue: (r) => r.code, cell: (r) => <span className="text-muted-foreground tabular-nums">{r.code}</span> },
          { header: "Uraian", hideable: true, defaultHidden: true, cell: (r) => clamp(r.uraian) },
          { header: "Tujuan", hideable: true, defaultHidden: true, cell: (r) => clamp(r.tujuan) },
          { header: "Produsen data", hideable: true, defaultHidden: true, sortValue: (r) => r.produsen ?? "", cell: (r) => (r.produsen ? opd.name(r.produsen, r.period) : "—") },
          { header: "Wali data", hideable: true, sortValue: (r) => r.opdName, cell: (r) => r.opdName },
          { header: "Informasi terkait (output)", hideable: true, defaultHidden: true, cell: (r) => clamp(r.output) },
          { header: "Informasi terkait (input)", hideable: true, defaultHidden: true, cell: (r) => clamp(r.input) },
          { header: "RAD 4", hideable: true, defaultHidden: true, sortValue: (r) => r.radL4 ?? "", cell: (r) => <span className="text-muted-foreground">{rads.forPeriod(r.period).text(r.radL4) ?? "—"}</span> },
          { header: "Sifat data", hideable: true, sortValue: (r) => r.sifat, cell: (r) => <StatusBadge status={sifatLabel[r.sifat]} /> },
          { header: "Jenis data", hideable: true, defaultHidden: true, sortValue: (r) => r.jenis, cell: (r) => jenisLabel[r.jenis] },
          { header: "Validitas data", hideable: true, defaultHidden: true, sortValue: (r) => r.validitas, cell: (r) => r.validitas },
          { header: "Interoperabilitas", hideable: true, defaultHidden: true, sortValue: (r) => Number(r.interoperabel), cell: (r) => (r.interoperabel ? "Ya" : "Tidak") },
          { header: "RAD 1", hideable: true, defaultHidden: true, sortValue: (r) => r.rad1 ?? "", cell: (r) => <span className="text-muted-foreground">{rad(r.rad1, r.period)}</span> },
          { header: "RAD 2", hideable: true, defaultHidden: true, sortValue: (r) => r.rad2 ?? "", cell: (r) => <span className="text-muted-foreground">{rad(r.rad2, r.period)}</span> },
          { header: "RAD 3", hideable: true, sortValue: (r) => r.rad3 ?? r.rad2 ?? "", cell: (r) => <span className="text-muted-foreground">{rad(r.rad3 ?? r.rad2, r.period)}</span> },
          { header: "Proses bisnis", hideable: true, defaultHidden: true, sortValue: (r) => r.probis.length, cell: (r) => links(r.probis) },
          { header: "Layanan", hideable: true, defaultHidden: true, sortValue: (r) => r.layanan.length, cell: (r) => links(r.layanan) },
          ...securityColumns<DataRecord>(),
          { header: "Periode", hideable: true, defaultHidden: true, sortValue: (r) => r.period, cell: (r) => r.period },
        ]}
      />

      {selected && <DataDetail record={selected} actor={actor} onClose={() => setSelected(null)} />}
    </Reveal>
  );
}
