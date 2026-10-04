"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Add01Icon, Download04Icon } from "@hugeicons/core-free-icons";
import { DataTable } from "@/components/blocks/data-table";
import { EmptyState } from "@/components/blocks/empty-state";
import { FilterBar } from "@/components/blocks/filter-bar";
import { StatusBadge } from "@/components/blocks/status-badge";
import { LayananDetail } from "@/components/cms/layanan/layanan-detail";
import { ReviewBadge } from "@/components/cms/review-badge";
import { Icon } from "@/components/icon";
import { useRalSet } from "@/components/layanan/ral-context";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { metodeLabel, metodeOptions, targetLabel, targetOptions } from "@/lib/layanan/reference";
import { can, type Actor } from "@/lib/permissions";
import { perangkatDaerah, type PeriodOptions } from "@/lib/probis/reference";
import type { LayananRecord, SubmissionStatus } from "@/lib/types";

type Tab = "all" | "review" | SubmissionStatus;

const tabs: { value: Tab; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "draft", label: "Draf" },
  { value: "submitted", label: "Diajukan" },
  { value: "verified", label: "Diverifikasi" },
  { value: "approved", label: "Disetujui" },
  { value: "rejected", label: "Dikembalikan" },
  { value: "review", label: "Perlu pemetaan RAL" },
];

/** Daftar layanan CMS: tab status, filter, tabel ramping (kolom inti), detail via pop-up. */
export function LayananTable({ rows, actor, periods }: { rows: LayananRecord[]; actor: Actor; periods: PeriodOptions }) {
  const rals = useRalSet();
  /** Nama RAL mengikuti versi RAL periode masing-masing layanan. */
  const ral = (code: string | null, period: string) => (code ? rals.forPeriod(period).label(code) : "—");
  const [tab, setTab] = useState<Tab>("all");
  const [pd, setPd] = useState<string[]>([]);
  const [metode, setMetode] = useState<string[]>([]);
  const [target, setTarget] = useState<string[]>([]);
  const [period, setPeriod] = useState<string>(periods.active);
  const [selected, setSelected] = useState<LayananRecord | null>(null);

  /** Baris sesuai filter (tanpa tab status), dasar hitungan di tiap tab. */
  const scoped = useMemo(
    () =>
      rows.filter(
        (r) => (!pd.length || pd.includes(r.opdCode)) && (!metode.length || metode.includes(r.metode)) && (!target.length || target.includes(r.target)) && (period === "__all" || r.period === period),
      ),
    [rows, pd, metode, target, period],
  );
  const counts = useMemo(() => {
    const map = new Map<string, number>([["all", scoped.length]]);
    for (const r of scoped) {
      map.set(r.status, (map.get(r.status) ?? 0) + 1);
      if (r.ralReview) map.set("review", (map.get("review") ?? 0) + 1);
    }
    return map;
  }, [scoped]);
  const visible = tab === "all" ? scoped : tab === "review" ? scoped.filter((r) => r.ralReview) : scoped.filter((r) => r.status === tab);

  if (!rows.length) {
    return (
      <Card data-reveal>
        <EmptyState title="Belum ada layanan" description="Tambahkan satu per satu dengan bantuan AI, atau impor template Domain Arsitektur Layanan.">
          {can.create(actor) && (
            <Button asChild>
              <Link href="/cms/layanan/baru">
                <Icon icon={Add01Icon} size={16} />
                Tambah layanan
              </Link>
            </Button>
          )}
          {can.import(actor) && (
            <Button asChild variant="outline">
              <Link href="/cms/layanan/impor">Impor template</Link>
            </Button>
          )}
        </EmptyState>
      </Card>
    );
  }

  return (
    <Reveal className="grid gap-4">
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} data-reveal>
        <TabsList className="h-auto flex-wrap">
          {tabs
            .filter((t) => t.value !== "review" || counts.get("review"))
            .map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="gap-1.5">
                {t.label}
                <span className="rounded-full bg-muted px-1.5 text-[10px] tabular-nums">{counts.get(t.value) ?? 0}</span>
              </TabsTrigger>
            ))}
        </TabsList>
      </Tabs>

      <FilterBar
        filters={[
          ...(can.readAll(actor) ? [{ label: "Perangkat Daerah", wide: true, multiple: true, searchable: true, options: perangkatDaerah.map((p) => ({ value: p.code, label: p.name })), values: pd, onValuesChange: setPd }] : []),
          { label: "Metode", multiple: true, options: metodeOptions, values: metode, onValuesChange: setMetode },
          { label: "Target", multiple: true, options: targetOptions, values: target, onValuesChange: setTarget },
          { label: "Periode", options: periods.periods, value: period, onChange: setPeriod },
        ]}
      />

      <DataTable
        title={tab === "all" ? "Semua status" : tabs.find((t) => t.value === tab)!.label}
        rows={visible}
        rowId={(r) => r.id}
        searchText={(r) => `${r.code} ${r.name} ${r.opdName} ${r.tujuan}`}
        searchPlaceholder="Cari nama, ID, OPD, atau tujuan"
        onRowClick={setSelected}
        pageSize={20}
        minWidth={900}
        actions={
          <>
            {can.export(actor) && (
              <Button asChild variant="outline">
                <a href="/api/export/layanan">
                  <Icon icon={Download04Icon} size={16} />
                  Ekspor
                </a>
              </Button>
            )}
            {can.create(actor) && (
              <Button asChild>
                <Link href="/cms/layanan/baru">
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
            header: "Nama layanan",
            sortValue: (r) => r.name,
            cell: (r) => (
              <span className="font-semibold">
                {r.name}
                {r.isSample && <Badge variant="muted" className="ml-2 align-middle">Contoh</Badge>}
                {r.ralReview && <Badge variant="warning" className="ml-2 align-middle">Perlu pemetaan RAL</Badge>}
              </span>
            ),
          },
          { header: "Metode", hideable: true, sortValue: (r) => r.metode, cell: (r) => <StatusBadge status={metodeLabel[r.metode]} /> },
          { header: "Perangkat Daerah", hideable: true, sortValue: (r) => r.opdName, cell: (r) => r.opdName },
          { header: "RAL 3", hideable: true, sortValue: (r) => r.ral3 ?? "", cell: (r) => <span className="text-muted-foreground">{ral(r.ral3, r.period)}</span> },
          { header: "Target", hideable: true, defaultHidden: true, sortValue: (r) => r.target, cell: (r) => targetLabel[r.target] },
          { header: "RAL 1", hideable: true, defaultHidden: true, sortValue: (r) => r.ral1 ?? "", cell: (r) => <span className="text-muted-foreground">{ral(r.ral1, r.period)}</span> },
          { header: "RAL 2", hideable: true, defaultHidden: true, sortValue: (r) => r.ral2 ?? "", cell: (r) => <span className="text-muted-foreground">{ral(r.ral2, r.period)}</span> },
          { header: "Tujuan", hideable: true, defaultHidden: true, cell: (r) => <span className="line-clamp-2 text-muted-foreground">{r.tujuan}</span> },
          { header: "Proses bisnis", hideable: true, defaultHidden: true, sortValue: (r) => r.probis.length, cell: (r) => (r.probis.length ? `${r.probis.length} probis` : "—") },
          { header: "Periode", hideable: true, defaultHidden: true, sortValue: (r) => r.period, cell: (r) => r.period },
        ]}
      />

      {selected && <LayananDetail record={selected} actor={actor} onClose={() => setSelected(null)} />}
    </Reveal>
  );
}
