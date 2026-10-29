"use client";
import Link from "next/link";
import { matchesCmsPeriod } from "@/lib/cms/list-navigation";
import { useListFilters } from "@/components/cms/use-list-filters";
import { useMemo, useState } from "react";
import { Add01Icon, Download04Icon } from "@hugeicons/core-free-icons";
import { useRaiSet } from "@/components/infrastruktur/rai-context";
import { DataTable } from "@/components/blocks/data-table";
import { EmptyState } from "@/components/blocks/empty-state";
import { FilterBar } from "@/components/blocks/filter-bar";
import { InfrastrukturDetail } from "@/components/cms/infrastruktur/infrastruktur-detail";
import { StatusBadge, ToneBadge } from "@/components/blocks/status-badge";
import { ReviewBadge } from "@/components/cms/review-badge";
import { StatusTabs } from "@/components/cms/status-tabs";
import { Icon } from "@/components/icon";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { jenisConfig, jenisOptions, kepemilikanLabel, kepemilikanOptions } from "@/lib/infrastruktur/jenis";
import { can, type Actor } from "@/lib/permissions";
import { perangkatDaerah, type PeriodOptions } from "@/lib/probis/reference";
import type { InfrastrukturRecord, SubmissionStatus } from "@/lib/types";

type Tab = "all" | "review" | SubmissionStatus;

const tabs: { value: Tab; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "draft", label: "Draf" },
  { value: "submitted", label: "Diajukan" },
  { value: "verified", label: "Diverifikasi" },
  { value: "approved", label: "Disetujui" },
  { value: "rejected", label: "Dikembalikan" },
  { value: "review", label: "Perlu pemetaan RAI" },
];

/** Daftar komponen CMS: tab status, filter komponen, tabel ramping (kolom inti, notulen), detail via pop-up. */
export function InfrastrukturList({ rows, actor, periods }: { rows: InfrastrukturRecord[]; actor: Actor; periods: PeriodOptions }) {
  const rais = useRaiSet();
  const rai = (code: string | null, period: string) => (code ? rais.forPeriod(period).label(code) : "—");
  const { tab, setTab, period, setPeriod } = useListFilters();
  const [pd, setPd] = useState<string[]>([]);
  const [jenis, setJenis] = useState<string[]>([]);
  const [owner, setOwner] = useState<string[]>([]);
  const [selected, setSelected] = useState<InfrastrukturRecord | null>(null);

  /** Baris sesuai filter (tanpa tab status), dasar hitungan di tiap tab. */
  const scoped = useMemo(
    () =>
      rows.filter(
        (r) => (!pd.length || pd.includes(r.opdCode)) && (!jenis.length || jenis.includes(r.jenis)) && (!owner.length || (!!r.kepemilikan && owner.includes(r.kepemilikan))) && matchesCmsPeriod(r.period, period),
      ),
    [rows, pd, jenis, owner, period],
  );
  const counts = useMemo(() => {
    const map = new Map<string, number>([["all", scoped.length]]);
    for (const r of scoped) {
      map.set(r.status, (map.get(r.status) ?? 0) + 1);
      if (r.raiReview) map.set("review", (map.get("review") ?? 0) + 1);
    }
    return map;
  }, [scoped]);
  const visible = tab === "all" ? scoped : tab === "review" ? scoped.filter((r) => r.raiReview) : scoped.filter((r) => r.status === tab);

  if (!rows.length) {
    return (
      <Card data-reveal>
        <EmptyState illustration="data-center" title="Belum ada komponen infrastruktur" description="Tambahkan satu per satu dengan bantuan AI, atau impor 10 template Domain Arsitektur Infrastruktur sekaligus.">
          {can.create(actor) && (
            <Button asChild variant="teal">
              <Link href="/cms/infrastruktur/baru">
                <Icon icon={Add01Icon} size={16} />
                Tambah komponen
              </Link>
            </Button>
          )}
          {can.import(actor) && (
            <Button asChild variant="outline">
              <Link href="/cms/infrastruktur/impor">Impor template</Link>
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
          ...(can.readAll(actor) ? [{ label: "Instansi", wide: true, multiple: true, searchable: true, options: perangkatDaerah.map((p) => ({ value: p.code, label: p.name })), values: pd, onValuesChange: setPd }] : []),
          { label: "Komponen", wide: true, multiple: true, options: jenisOptions, values: jenis, onValuesChange: setJenis },
          { label: "Kepemilikan", multiple: true, options: [...kepemilikanOptions], values: owner, onValuesChange: setOwner },
          { label: "Periode", options: periods.periods, value: period, onChange: setPeriod },
        ]}
      />

      <DataTable
        title={tab === "all" ? "Semua status" : tabs.find((t) => t.value === tab)!.label}
        rows={visible}
        rowId={(r) => r.id}
        searchText={(r) => `${r.code} ${r.name} ${r.opdName} ${jenisConfig[r.jenis].label} ${r.deskripsi ?? ""} ${Object.values(r.atribut).join(" ")}`}
        searchPlaceholder="Cari nama, ID, instansi, atau spesifikasi"
        onRowClick={setSelected}
        pageSize={20}
        minWidth={860}
        actions={
          <>
            {can.export(actor) && (
              <Button asChild variant="outline">
                <a href="/api/export/infrastruktur">
                  <Icon icon={Download04Icon} size={16} />
                  Ekspor
                </a>
              </Button>
            )}
            {can.create(actor) && (
              <Button asChild variant="teal">
                <Link href="/cms/infrastruktur/baru">
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
            header: "Nama komponen",
            sortValue: (r) => r.name,
            cell: (r) => (
              <span className="font-semibold">
                {r.name}
                {r.isSample && <Badge variant="muted" className="ml-2 align-middle">Contoh</Badge>}
                {r.raiReview && <Badge variant="warning" className="ml-2 align-middle">Perlu pemetaan RAI</Badge>}
              </span>
            ),
          },
          { header: "Komponen", sortValue: (r) => r.jenis, cell: (r) => <ToneBadge tone={jenisConfig[r.jenis].tone}>{jenisConfig[r.jenis].short}</ToneBadge> },
          { header: "Instansi", hideable: true, sortValue: (r) => r.opdName, cell: (r) => r.opdName },
          { header: "Kepemilikan", hideable: true, defaultHidden: true, sortValue: (r) => r.kepemilikan ?? "", cell: (r) => (r.kepemilikan ? <StatusBadge status={kepemilikanLabel[r.kepemilikan]} /> : "—") },
          { header: "RAI", hideable: true, defaultHidden: true, sortValue: (r) => r.rai3 ?? r.rai2 ?? "", cell: (r) => <span className="text-muted-foreground">{rai(r.rai3 ?? r.rai2, r.period)}</span> },
          { header: "Relasi", hideable: true, defaultHidden: true, sortValue: (r) => r.relasi.length + r.terhubung.length, cell: (r) => `${r.relasi.length + r.terhubung.length} komponen` },
        ]}
      />

      {selected && <InfrastrukturDetail record={selected} actor={actor} onClose={() => setSelected(null)} />}
    </Reveal>
  );
}
