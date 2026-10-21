"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Add01Icon, Download04Icon } from "@hugeicons/core-free-icons";
import { Banner } from "@/components/blocks/banner";
import { DataTable } from "@/components/blocks/data-table";
import { EmptyState } from "@/components/blocks/empty-state";
import { FilterBar } from "@/components/blocks/filter-bar";
import { ToneBadge } from "@/components/blocks/status-badge";
import { RencanaDetail } from "@/components/cms/peta-rencana/rencana-detail";
import { StatusTabs } from "@/components/cms/status-tabs";
import { Icon } from "@/components/icon";
import { Reveal } from "@/components/motion/reveal";
import { RencanaStatus } from "@/components/peta-rencana/rencana-body";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { muatanConfig, muatanOptions, statusConfig, statusKeys, type RencanaStatus as Status } from "@/lib/peta-rencana/muatan";
import { yearsOf } from "@/lib/peta-rencana/query";
import { perangkatDaerah, type PeriodOptions } from "@/lib/probis/reference";
import type { RencanaRecord } from "@/lib/types";

type Tab = "all" | Status;

const tabs: { value: Tab; label: string }[] = [{ value: "all", label: "Semua" }, ...statusKeys.map((k) => ({ value: k, label: statusConfig[k].label }))];

/** Daftar kegiatan Peta Rencana CMS: tab status pelaksanaan, filter periode/tahun/PD/muatan, detail via pop-up. */
export function RencanaList({ rows, periods, canManage, canExport, openHighGaps = 0 }: { rows: RencanaRecord[]; periods: PeriodOptions; canManage: boolean; canExport: boolean; /** Gap prioritas tinggi yang masih terbuka di periode aktif. */ openHighGaps?: number }) {
  const [tab, setTab] = useState<Tab>("all");
  const [period, setPeriod] = useState(periods.active);
  const [tahun, setTahun] = useState<string[]>([]);
  const [pd, setPd] = useState<string[]>([]);
  const [muatan, setMuatan] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Baris dari server bisa berubah (alihkan/hapus); detail selalu memakai versi terbaru.
  const selected = rows.find((r) => r.id === selectedId) ?? null;

  const scoped = useMemo(
    () => rows.filter((r) => r.period === period && (!tahun.length || tahun.includes(String(r.year))) && (!pd.length || pd.includes(r.opdCode)) && (!muatan.length || muatan.includes(r.muatan))),
    [rows, period, tahun, pd, muatan],
  );
  const counts = useMemo(() => {
    const map = new Map<string, number>([["all", scoped.length]]);
    for (const r of scoped) map.set(r.status, (map.get(r.status) ?? 0) + 1);
    return map;
  }, [scoped]);
  const visible = tab === "all" ? scoped : scoped.filter((r) => r.status === tab);

  if (!rows.length) {
    return (
      <Card data-reveal>
        <EmptyState illustration="roadmap" title="Peta rencana masih kosong" description="Susun kegiatan target arsitektur per tahun, atau impor dari Excel.">
          {canManage && (
            <>
              <Button asChild variant="teal">
                <Link href="/cms/peta-rencana/baru">
                  <Icon icon={Add01Icon} size={16} />
                  Tambah kegiatan
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/cms/peta-rencana/impor">Impor Excel</Link>
              </Button>
            </>
          )}
        </EmptyState>
      </Card>
    );
  }

  return (
    <Reveal className="grid gap-4">
      {canManage && openHighGaps > 0 && (
        <Banner
          variant="warning"
          label="Gap analysis"
          action={
            <Button asChild size="sm" variant="outline">
              <Link href="/cms/gap-analysis">Buka gap analysis</Link>
            </Button>
          }
        >
          {openHighGaps.toLocaleString("id-ID")} kesenjangan prioritas tinggi belum ditindaklanjuti. Selesaikan atau usulkan dulu sebelum menyusun kegiatan baru.
        </Banner>
      )}
      <StatusTabs value={tab} onChange={setTab} counts={counts} tabs={tabs} />

      <FilterBar
        filters={[
          { label: "Periode", required: true, options: periods.periods, value: period, onChange: (v) => (setPeriod(v), setTahun([])) },
          { label: "Tahun", multiple: true, options: yearsOf(period), values: tahun, onValuesChange: setTahun },
          { label: "Perangkat Daerah", wide: true, multiple: true, searchable: true, options: perangkatDaerah.map((p) => ({ value: p.code, label: p.name })), values: pd, onValuesChange: setPd },
          { label: "Muatan", multiple: true, options: muatanOptions, values: muatan, onValuesChange: setMuatan },
        ]}
      />

      <DataTable
        title={tab === "all" ? "Semua status" : statusConfig[tab].label}
        rows={visible}
        rowId={(r) => r.id}
        searchText={(r) => `${r.code} ${r.name} ${r.opdName} ${r.program ?? ""} ${r.inisiatif ?? ""} ${r.sasaran}`}
        searchPlaceholder="Cari kegiatan, program, PD, atau ID"
        onRowClick={(r) => setSelectedId(r.id)}
        pageSize={20}
        minWidth={820}
        actions={
          <>
            {canExport && (
              <Button asChild variant="outline">
                <a href="/api/export/peta-rencana">
                  <Icon icon={Download04Icon} size={16} />
                  Ekspor
                </a>
              </Button>
            )}
            {canManage && (
              <Button asChild variant="teal">
                <Link href="/cms/peta-rencana/baru">
                  <Icon icon={Add01Icon} size={16} />
                  Tambah
                </Link>
              </Button>
            )}
          </>
        }
        columns={[
          { header: "Status", sortValue: (r) => statusKeys.indexOf(r.status), cell: (r) => <RencanaStatus status={r.status} /> },
          { header: "Tahun", className: "tabular-nums", sortValue: (r) => r.year, cell: (r) => r.year },
          {
            header: "Kegiatan",
            sortValue: (r) => r.name,
            cell: (r) => (
              <span className="font-semibold">
                {r.name}
                {r.source === "usulan_tertunda" && <Badge variant="warning" className="ml-2 align-middle">Dialihkan</Badge>}
                {r.isSample && <Badge variant="muted" className="ml-2 align-middle">Contoh</Badge>}
              </span>
            ),
          },
          { header: "Perangkat Daerah", sortValue: (r) => r.opdName, cell: (r) => r.opdName },
          { header: "Muatan", hideable: true, sortValue: (r) => r.muatan, cell: (r) => <ToneBadge tone={muatanConfig[r.muatan].tone}>{muatanConfig[r.muatan].label}</ToneBadge> },
          { header: "Program", hideable: true, defaultHidden: true, sortValue: (r) => r.program ?? "", cell: (r) => r.program ?? "—" },
          { header: "ID", hideable: true, defaultHidden: true, className: "whitespace-nowrap", sortValue: (r) => r.code, cell: (r) => <span className="text-muted-foreground tabular-nums">{r.code}</span> },
        ]}
      />

      {selected && <RencanaDetail record={selected} canManage={canManage} onClose={() => setSelectedId(null)} />}
    </Reveal>
  );
}
