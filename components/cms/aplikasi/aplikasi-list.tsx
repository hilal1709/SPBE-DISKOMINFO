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
import { clamp, lines, links, securityColumns } from "@/components/cms/template-cells";
import { flowLabels } from "@/lib/aplikasi/data-flow";
import { Icon } from "@/components/icon";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { StatusTabs } from "@/components/cms/status-tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { basisLabel, basisOptions, kepemilikanLabel, kepemilikanOptions, lisensiLabel } from "@/lib/aplikasi/reference";
import { can, type Actor } from "@/lib/permissions";
import { type PeriodOptions } from "@/lib/probis/reference";
import { useOpd } from "@/components/opd/opd-context";
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
  const opd = useOpd();
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
          ...(can.readAll(actor) ? [{ label: "Unit operasional", wide: true, multiple: true, searchable: true, options: opd.all().map((p) => ({ value: p.code, label: p.name })), values: pd, onValuesChange: setPd }] : []),
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
          { header: "ID", className: "whitespace-nowrap", sortValue: (r) => r.code, cell: (r) => <span className="text-muted-foreground tabular-nums">{r.code}</span> },
          { header: "Uraian", hideable: true, defaultHidden: true, cell: (r) => clamp(r.uraian) },
          { header: "Fungsi", hideable: true, defaultHidden: true, cell: (r) => clamp(r.fungsi) },
          { header: "Luaran", hideable: true, defaultHidden: true, cell: (r) => clamp(r.luaran) },
          { header: "Mesin basis data", hideable: true, defaultHidden: true, sortValue: (r) => r.mesin ?? "", cell: (r) => r.mesin ?? "—" },
          { header: "Basis aplikasi", hideable: true, defaultHidden: true, sortValue: (r) => r.basis, cell: (r) => basisLabel[r.basis] },
          { header: "Tipe lisensi", hideable: true, defaultHidden: true, sortValue: (r) => r.lisensi, cell: (r) => lisensiLabel[r.lisensi] },
          { header: "Bahasa pemrograman", hideable: true, defaultHidden: true, sortValue: (r) => r.bahasa, cell: (r) => r.bahasa || "—" },
          { header: "RAA 1", hideable: true, defaultHidden: true, sortValue: (r) => r.raa1 ?? "", cell: (r) => <span className="text-muted-foreground">{raa(r.raa1, r.period)}</span> },
          { header: "RAA 2", hideable: true, sortValue: (r) => r.raa3 ?? r.raa2 ?? "", cell: (r) => <span className="text-muted-foreground">{raa(r.raa3 ?? r.raa2, r.period)}</span> },
          { header: "Layanan", hideable: true, sortValue: (r) => r.layanan.length, cell: (r) => links(r.layanan) },
          { header: "Data yang digunakan", hideable: true, defaultHidden: true, sortValue: (r) => r.data.length, cell: (r) => links(r.data) },
          { header: "Proses bisnis", hideable: true, defaultHidden: true, sortValue: (r) => r.probis.length, cell: (r) => links(r.probis) },
          { header: "Inputan data", hideable: true, sortValue: (r) => flowLabels(r.inputData, r.dataNames).length, cell: (r) => lines(flowLabels(r.inputData, r.dataNames).join("\n")) },
          { header: "Supplier data", hideable: true, defaultHidden: true, cell: (r) => lines(r.supplier) },
          { header: "Luaran data", hideable: true, sortValue: (r) => flowLabels(r.outputData, r.dataNames).length, cell: (r) => lines(flowLabels(r.outputData, r.dataNames).join("\n")) },
          { header: "Customer data", hideable: true, defaultHidden: true, cell: (r) => lines(r.customer) },
          { header: "Komputasi awan", hideable: true, defaultHidden: true, cell: (r) => lines(r.cloud) },
          { header: "Perangkat keras server", hideable: true, defaultHidden: true, cell: (r) => lines(r.server) },
          { header: "Sistem penghubung layanan", hideable: true, defaultHidden: true, cell: (r) => lines(r.splp) },
          { header: "Jaringan intra pemerintah", hideable: true, defaultHidden: true, cell: (r) => lines(r.jip) },
          { header: "Kerangka pengembangan", hideable: true, defaultHidden: true, sortValue: (r) => r.kerangka ?? "", cell: (r) => r.kerangka ?? "—" },
          { header: "Unit pengembang", hideable: true, defaultHidden: true, sortValue: (r) => r.pengembang, cell: (r) => <span>{opd.name(r.pengembang, r.period)} <Badge variant="muted" className="ml-1 align-middle">{kepemilikanLabel[r.kepemilikan]}</Badge></span> },
          { header: "Unit operasional", hideable: true, sortValue: (r) => r.opdName, cell: (r) => r.opdName },
          ...securityColumns<AplikasiRecord>(["standar", "audit", "peningkatan", "insiden", "edukasi", "kelaikan", "kerentanan"]),
          { header: "Periode", hideable: true, defaultHidden: true, sortValue: (r) => r.period, cell: (r) => r.period },
        ]}
      />

      {selected && <AplikasiDetail record={selected} actor={actor} onClose={() => setSelected(null)} />}
    </Reveal>
  );
}
