"use client";
import Link from "next/link";
import { matchesCmsPeriod } from "@/lib/cms/list-navigation";
import { useListFilters } from "@/components/cms/use-list-filters";
import { useMemo, useState } from "react";
import { Add01Icon, Download04Icon } from "@hugeicons/core-free-icons";
import { useRaaSet } from "@/components/aplikasi/raa-context";
import { DataTable } from "@/components/blocks/data-table";
import { EmptyState } from "@/components/blocks/empty-state";
import { FilterBar } from "@/components/blocks/filter-bar";
import { AplikasiDetail } from "@/components/cms/aplikasi/aplikasi-detail";
import { ReviewBadge } from "@/components/cms/review-badge";
import { Icon } from "@/components/icon";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { StatusTabs } from "@/components/cms/status-tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { basisLabel, basisOptions, kepemilikanLabel, kepemilikanOptions, lisensiLabel } from "@/lib/aplikasi/reference";
import { can, type Actor } from "@/lib/permissions";
import { perangkatDaerah, type PeriodOptions } from "@/lib/probis/reference";
import type { AplikasiRecord, SubmissionStatus } from "@/lib/types";

type Tab = "all" | "review" | SubmissionStatus;

const tabs: { value: Tab; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "draft", label: "Draf" },
  { value: "submitted", label: "Diajukan" },
  { value: "verified", label: "Diverifikasi" },
  { value: "approved", label: "Disetujui" },
  { value: "rejected", label: "Dikembalikan" },
  { value: "review", label: "Perlu pemetaan RAA" },
];

/** Daftar aplikasi CMS: tab status, filter, tabel ramping (kolom inti, notulen), detail via pop-up. */
export function AplikasiList({ rows, actor, periods }: { rows: AplikasiRecord[]; actor: Actor; periods: PeriodOptions }) {
  const raas = useRaaSet();
  /** Nama RAA mengikuti versi RAA periode masing-masing aplikasi. */
  const raa = (code: string | null, period: string) => (code ? raas.forPeriod(period).label(code) : "—");
  const { tab, setTab, period, setPeriod } = useListFilters();
  const [pd, setPd] = useState<string[]>([]);
  const [basis, setBasis] = useState<string[]>([]);
  const [owner, setOwner] = useState<string[]>([]);
  const [selected, setSelected] = useState<AplikasiRecord | null>(null);

  /** Baris sesuai filter (tanpa tab status), dasar hitungan di tiap tab. */
  const scoped = useMemo(
    () => rows.filter((r) => (!pd.length || pd.includes(r.opdCode)) && (!basis.length || basis.includes(r.basis)) && (!owner.length || owner.includes(r.kepemilikan)) && matchesCmsPeriod(r.period, period)),
    [rows, pd, basis, owner, period],
  );
  const counts = useMemo(() => {
    const map = new Map<string, number>([["all", scoped.length]]);
    for (const r of scoped) {
      map.set(r.status, (map.get(r.status) ?? 0) + 1);
      if (r.raaReview) map.set("review", (map.get("review") ?? 0) + 1);
    }
    return map;
  }, [scoped]);
  const visible = tab === "all" ? scoped : tab === "review" ? scoped.filter((r) => r.raaReview) : scoped.filter((r) => r.status === tab);

  if (!rows.length) {
    return (
      <Card data-reveal>
        <EmptyState illustration="app-ecosystem" title="Belum ada aplikasi" description="Tambahkan satu per satu dengan bantuan AI, atau impor template Domain Arsitektur Aplikasi.">
          {can.create(actor) && (
            <Button asChild variant="teal">
              <Link href="/cms/aplikasi/baru">
                <Icon icon={Add01Icon} size={16} />
                Tambah aplikasi
              </Link>
            </Button>
          )}
          {can.import(actor) && (
            <Button asChild variant="outline">
              <Link href="/cms/aplikasi/impor">Impor template</Link>
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
          ...(can.readAll(actor) ? [{ label: "Unit operasional", wide: true, multiple: true, searchable: true, options: perangkatDaerah.map((p) => ({ value: p.code, label: p.name })), values: pd, onValuesChange: setPd }] : []),
          { label: "Basis", multiple: true, options: basisOptions, values: basis, onValuesChange: setBasis },
          { label: "Kepemilikan", multiple: true, options: kepemilikanOptions, values: owner, onValuesChange: setOwner },
          { label: "Periode", options: periods.periods, value: period, onChange: setPeriod },
        ]}
      />

      <DataTable
        title={tab === "all" ? "Semua status" : tabs.find((t) => t.value === tab)!.label}
        rows={visible}
        rowId={(r) => r.id}
        searchText={(r) => `${r.code} ${r.name} ${r.opdName} ${r.pengembang} ${r.uraian}`}
        searchPlaceholder="Cari nama, ID, unit, atau uraian"
        onRowClick={setSelected}
        pageSize={20}
        minWidth={900}
        actions={
          <>
            {can.export(actor) && (
              <Button asChild variant="outline">
                <a href="/api/export/aplikasi">
                  <Icon icon={Download04Icon} size={16} />
                  Ekspor
                </a>
              </Button>
            )}
            {can.create(actor) && (
              <Button asChild variant="teal">
                <Link href="/cms/aplikasi/baru">
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
            header: "Nama aplikasi",
            sortValue: (r) => r.name,
            cell: (r) => (
              <span className="font-semibold">
                {r.name}
                {r.isSample && <Badge variant="muted" className="ml-2 align-middle">Contoh</Badge>}
                {r.raaReview && <Badge variant="warning" className="ml-2 align-middle">Perlu pemetaan RAA</Badge>}
              </span>
            ),
          },
          { header: "Unit operasional", hideable: true, sortValue: (r) => r.opdName, cell: (r) => r.opdName },
          { header: "Kepemilikan", hideable: true, sortValue: (r) => r.kepemilikan, cell: (r) => <Badge variant="muted">{kepemilikanLabel[r.kepemilikan]}</Badge> },
          { header: "RAA", hideable: true, sortValue: (r) => r.raa3 ?? r.raa2 ?? "", cell: (r) => <span className="text-muted-foreground">{raa(r.raa3 ?? r.raa2, r.period)}</span> },
          { header: "Basis", hideable: true, defaultHidden: true, sortValue: (r) => r.basis, cell: (r) => basisLabel[r.basis] },
          { header: "Lisensi", hideable: true, defaultHidden: true, sortValue: (r) => r.lisensi, cell: (r) => lisensiLabel[r.lisensi] },
          { header: "Mesin basis data", hideable: true, defaultHidden: true, sortValue: (r) => r.mesin ?? "", cell: (r) => r.mesin ?? "—" },
          { header: "Proses bisnis", hideable: true, defaultHidden: true, sortValue: (r) => r.probis.length, cell: (r) => `${r.probis.length} probis` },
          { header: "Layanan", hideable: true, defaultHidden: true, sortValue: (r) => r.layanan.length, cell: (r) => (r.layanan.length ? `${r.layanan.length} layanan` : "—") },
        ]}
      />

      {selected && <AplikasiDetail record={selected} actor={actor} onClose={() => setSelected(null)} />}
    </Reveal>
  );
}
