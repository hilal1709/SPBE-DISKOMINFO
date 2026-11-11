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
import { LayananDetail } from "@/components/cms/layanan/layanan-detail";
import { ReviewBadge } from "@/components/cms/review-badge";
import { clamp, links } from "@/components/cms/template-cells";
import { useRabSet } from "@/components/probis/rab-context";
import { Icon } from "@/components/icon";
import { useRalSet } from "@/components/layanan/ral-context";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { StatusTabs } from "@/components/cms/status-tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { metodeLabel, metodeOptions, targetLabel, targetOptions } from "@/lib/layanan/reference";
import { can, type Actor } from "@/lib/permissions";
import { type PeriodOptions } from "@/lib/probis/reference";
import { useOpd } from "@/components/opd/opd-context";
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
  const opd = useOpd();
  const rals = useRalSet();
  const rabs = useRabSet();
  /** Nama RAL mengikuti versi RAL periode masing-masing layanan. */
  const ral = (code: string | null, period: string) => (code ? rals.forPeriod(period).label(code) : "—");
  const { tab, setTab, period, setPeriod } = useListFilters();
  const [pd, setPd] = useState<string[]>([]);
  const [metode, setMetode] = useState<string[]>([]);
  const [target, setTarget] = useState<string[]>([]);
  const [selected, setSelected] = useState<LayananRecord | null>(null);

  /** Baris sesuai filter (tanpa tab status), dasar hitungan di tiap tab. */
  const scoped = useMemo(
    () =>
      rows.filter(
        (r) => (!pd.length || pd.includes(r.opdCode)) && (!metode.length || metode.includes(r.metode)) && (!target.length || target.includes(r.target)) && matchesCmsPeriod(r.period, period),
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
            <Button asChild variant="teal">
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
      <StatusTabs value={tab} onChange={setTab} counts={counts} tabs={tabs.filter((t) => t.value !== "review" || counts.get("review"))} />

      <FilterBar
        filters={[
          ...(can.readAll(actor) ? [{ label: "Perangkat Daerah", wide: true, multiple: true, searchable: true, options: opd.all().map((p) => ({ value: p.code, label: p.name })), values: pd, onValuesChange: setPd }] : []),
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
              <Button asChild variant="teal">
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
          { header: "ID", className: "whitespace-nowrap", sortValue: (r) => r.code, cell: (r) => <span className="text-muted-foreground tabular-nums">{r.code}</span> },
          { header: "Tujuan", hideable: true, defaultHidden: true, cell: (r) => clamp(r.tujuan) },
          { header: "Fungsi", hideable: true, defaultHidden: true, cell: (r) => clamp(r.fungsi) },
          { header: "Urusan pemerintahan (RAB 2)", hideable: true, defaultHidden: true, sortValue: (r) => r.rab2 ?? "", cell: (r) => <span className="text-muted-foreground">{r.rab2 ? rabs.forPeriod(r.period).label(r.rab2) : "—"}</span> },
          { header: "Target layanan", hideable: true, defaultHidden: true, sortValue: (r) => r.target, cell: (r) => targetLabel[r.target] },
          { header: "Potensi manfaat", hideable: true, defaultHidden: true, cell: (r) => clamp(r.manfaat) },
          { header: "Potensi ekonomi", hideable: true, defaultHidden: true, cell: (r) => clamp(r.ekonomi) },
          { header: "RAL 4", hideable: true, defaultHidden: true, sortValue: (r) => r.ralL4 ?? "", cell: (r) => <span className="text-muted-foreground">{rals.forPeriod(r.period).text(r.ralL4) ?? "—"}</span> },
          { header: "RAL 5", hideable: true, defaultHidden: true, sortValue: (r) => r.ralL5 ?? "", cell: (r) => <span className="text-muted-foreground">{rals.forPeriod(r.period).text(r.ralL5) ?? "—"}</span> },
          { header: "Metode layanan", hideable: true, sortValue: (r) => r.metode, cell: (r) => <StatusBadge status={metodeLabel[r.metode]} /> },
          { header: "Kementerian/Lembaga terkait", hideable: true, defaultHidden: true, sortValue: (r) => r.kl ?? "", cell: (r) => r.kl ?? "—" },
          { header: "RAL 1", hideable: true, defaultHidden: true, sortValue: (r) => r.ral1 ?? "", cell: (r) => <span className="text-muted-foreground">{ral(r.ral1, r.period)}</span> },
          { header: "RAL 2", hideable: true, defaultHidden: true, sortValue: (r) => r.ral2 ?? "", cell: (r) => <span className="text-muted-foreground">{ral(r.ral2, r.period)}</span> },
          { header: "RAL 3", hideable: true, sortValue: (r) => r.ral3 ?? "", cell: (r) => <span className="text-muted-foreground">{ral(r.ral3, r.period)}</span> },
          { header: "Unit pelaksana", hideable: true, sortValue: (r) => r.opdName, cell: (r) => r.opdName },
          { header: "Potensi risiko", hideable: true, defaultHidden: true, cell: (r) => clamp(r.risiko) },
          { header: "Mitigasi risiko", hideable: true, defaultHidden: true, cell: (r) => clamp(r.mitigasi) },
          { header: "Proses bisnis", hideable: true, defaultHidden: true, sortValue: (r) => r.probis.length, cell: (r) => links(r.probis) },
          { header: "Periode", hideable: true, defaultHidden: true, sortValue: (r) => r.period, cell: (r) => r.period },
        ]}
      />

      {selected && <LayananDetail record={selected} actor={actor} onClose={() => setSelected(null)} />}
    </Reveal>
  );
}
