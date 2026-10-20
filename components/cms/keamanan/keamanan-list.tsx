"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Add01Icon, Download04Icon } from "@hugeicons/core-free-icons";
import { DataTable } from "@/components/blocks/data-table";
import { EmptyState } from "@/components/blocks/empty-state";
import { FilterBar } from "@/components/blocks/filter-bar";
import { KeamananDetail } from "@/components/cms/keamanan/keamanan-detail";
import { ToneBadge } from "@/components/blocks/status-badge";
import { ReviewBadge } from "@/components/cms/review-badge";
import { StatusTabs } from "@/components/cms/status-tabs";
import { Icon } from "@/components/icon";
import { tanggalText } from "@/components/keamanan/kegiatan";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { kegiatanConfig, kegiatanOptions } from "@/lib/keamanan/jenis";
import { can, type Actor } from "@/lib/permissions";
import { perangkatDaerah, type PeriodOptions } from "@/lib/probis/reference";
import type { KeamananRecord, SubmissionStatus } from "@/lib/types";

type Tab = "all" | SubmissionStatus;

const tabs: { value: Tab; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "draft", label: "Draf" },
  { value: "submitted", label: "Diajukan" },
  { value: "verified", label: "Diverifikasi" },
  { value: "approved", label: "Disetujui" },
  { value: "rejected", label: "Dikembalikan" },
];

/** Daftar kegiatan keamanan CMS: tab status, filter kegiatan, tabel ramping, detail via pop-up. */
export function KeamananList({ rows, actor, periods }: { rows: KeamananRecord[]; actor: Actor; periods: PeriodOptions }) {
  const [tab, setTab] = useState<Tab>("all");
  const [pd, setPd] = useState<string[]>([]);
  const [jenis, setJenis] = useState<string[]>([]);
  const [period, setPeriod] = useState<string>(periods.active);
  const [selected, setSelected] = useState<KeamananRecord | null>(null);

  const scoped = useMemo(() => rows.filter((r) => (!pd.length || pd.includes(r.opdCode)) && (!jenis.length || jenis.includes(r.jenis)) && r.period === period), [rows, pd, jenis, period]);
  const counts = useMemo(() => {
    const map = new Map<string, number>([["all", scoped.length]]);
    for (const r of scoped) map.set(r.status, (map.get(r.status) ?? 0) + 1);
    return map;
  }, [scoped]);
  const visible = tab === "all" ? scoped : scoped.filter((r) => r.status === tab);

  if (!rows.length) {
    return (
      <Card data-reveal>
        <EmptyState illustration="security-shield" title="Belum ada kegiatan keamanan" description="Catat standar, audit, edukasi, penanganan insiden, dan kegiatan keamanan lain, atau impor 7 template Domain Arsitektur Keamanan.">
          {can.create(actor) && (
            <Button asChild variant="teal">
              <Link href="/cms/keamanan/baru">
                <Icon icon={Add01Icon} size={16} />
                Tambah kegiatan
              </Link>
            </Button>
          )}
          {can.import(actor) && (
            <Button asChild variant="outline">
              <Link href="/cms/keamanan/impor">Impor template</Link>
            </Button>
          )}
        </EmptyState>
      </Card>
    );
  }

  return (
    <Reveal className="grid gap-4">
      <StatusTabs value={tab} onChange={setTab} counts={counts} tabs={tabs} />

      <FilterBar
        filters={[
          ...(can.readAll(actor) ? [{ label: "Instansi", wide: true, multiple: true, searchable: true, options: perangkatDaerah.map((p) => ({ value: p.code, label: p.name })), values: pd, onValuesChange: setPd }] : []),
          { label: "Kegiatan", wide: true, multiple: true, options: kegiatanOptions, values: jenis, onValuesChange: setJenis },
          { label: "Periode", required: true, options: periods.periods, value: period, onChange: setPeriod },
        ]}
      />

      <DataTable
        title={tab === "all" ? "Semua status" : tabs.find((t) => t.value === tab)!.label}
        rows={visible}
        rowId={(r) => r.id}
        searchText={(r) => `${r.code} ${r.name} ${r.opdName} ${kegiatanConfig[r.jenis].label} ${r.deskripsi ?? ""}`}
        searchPlaceholder="Cari nama, ID, instansi, atau deskripsi"
        onRowClick={setSelected}
        pageSize={20}
        minWidth={820}
        actions={
          <>
            {can.export(actor) && (
              <Button asChild variant="outline">
                <a href="/api/export/keamanan">
                  <Icon icon={Download04Icon} size={16} />
                  Ekspor
                </a>
              </Button>
            )}
            {can.create(actor) && (
              <Button asChild variant="teal">
                <Link href="/cms/keamanan/baru">
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
            header: "Nama kegiatan",
            sortValue: (r) => r.name,
            cell: (r) => (
              <span className="font-semibold">
                {r.name}
                {r.isSample && <Badge variant="muted" className="ml-2 align-middle">Contoh</Badge>}
              </span>
            ),
          },
          { header: "Kegiatan", sortValue: (r) => r.jenis, cell: (r) => <ToneBadge tone={kegiatanConfig[r.jenis].tone}>{kegiatanConfig[r.jenis].short}</ToneBadge> },
          { header: "Tanggal", hideable: true, sortValue: (r) => r.tanggal ?? "", cell: (r) => <span className="whitespace-nowrap text-muted-foreground">{tanggalText(r.tanggal)}</span> },
          { header: "Instansi", hideable: true, defaultHidden: true, sortValue: (r) => r.opdName, cell: (r) => r.opdName },
        ]}
      />

      {selected && <KeamananDetail record={selected} actor={actor} onClose={() => setSelected(null)} />}
    </Reveal>
  );
}
