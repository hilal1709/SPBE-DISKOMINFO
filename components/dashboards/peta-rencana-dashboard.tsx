"use client";
import { useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FilterResetIcon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { DataTable } from "@/components/blocks/data-table";
import { DetailDialog } from "@/components/blocks/detail-dialog";
import { EmptyState } from "@/components/blocks/empty-state";
import { FilterBar } from "@/components/blocks/filter-bar";
import { FilterChips, type Chip } from "@/components/blocks/filter-chips";
import { Gauge } from "@/components/blocks/gauge";
import { StatCard } from "@/components/blocks/stat-card";
import { StatRow } from "@/components/blocks/stat-row";
import { ToneBadge } from "@/components/blocks/status-badge";
import { BarChart } from "@/components/charts";
import { MuatanBento } from "@/components/dashboards/peta-rencana/muatan-bento";
import { SasaranPanel } from "@/components/dashboards/peta-rencana/sasaran-panel";
import { YearTrack, type YearStat } from "@/components/dashboards/peta-rencana/year-track";
import { ExploreHint } from "@/components/dashboards/probis/explore-hint";
import { Icon } from "@/components/icon";
import { Reveal } from "@/components/motion/reveal";
import { RencanaBody, RencanaStatus, rencanaMeta } from "@/components/peta-rencana/rencana-body";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { allRencana } from "@/lib/peta-rencana/generate";
import { muatanConfig, muatanKeys, muatanOptions, statusConfig, statusKeys, statusOptions, type Muatan } from "@/lib/peta-rencana/muatan";
import { activeFilterCount, emptyFilter, filterFromParams, filterRencana, filterToParams, sanitizeFilter, yearsOf, type RencanaFilter } from "@/lib/peta-rencana/query";
import { pdByCode, perangkatDaerah, sasaranStrategis, type PeriodOptions } from "@/lib/probis/reference";
import type { Rencana, RencanaIndicator } from "@/lib/types";

const fmt = new Intl.NumberFormat("id-ID");
const pdName = (code: string) => pdByCode.get(code)?.name ?? code;
const pdOptions = perangkatDaerah.map((pd) => ({ value: pd.code, label: pd.name }));
const toggle = (list: string[], value: string) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

/** Dashboard publik Peta Rencana. Semua widget mengikuti filter aktif; widget yang juga filter mengabaikan filternya sendiri. */
export function PetaRencanaDashboard({
  data,
  sample,
  currentYear,
  periods: { periods, active: activePeriod },
}: {
  /** Kegiatan & indikator dari database; null = data contoh bawaan. */
  data: { rows: Rencana[]; indicators: RencanaIndicator[] } | null;
  sample: boolean;
  currentYear: number;
  periods: PeriodOptions;
}) {
  const params = useSearchParams();
  const source = useMemo(() => data ?? allRencana(), [data]);
  const all = source.rows;
  const sasaranList = useMemo(() => [...new Set([...sasaranStrategis, ...all.map((r) => r.sasaran)])], [all]);
  const [filter, setFilterState] = useState<RencanaFilter>(() =>
    sanitizeFilter(filterFromParams(new URLSearchParams(params.toString()), activePeriod, sasaranList), {
      periods,
      defaultPeriod: activePeriod,
      pd: new Set([...pdByCode.keys(), ...all.map((r) => r.opd)]),
      sasaran: new Set(sasaranList),
      muatan: new Set(muatanKeys),
      status: new Set(statusKeys),
    }),
  );
  const [selected, setSelected] = useState<Rencana | null>(null);
  const latest = useRef(filter);

  /** Filter disimpan di URL agar tampilan bisa dibagikan, tanpa memicu navigasi. */
  const setFilter = (next: RencanaFilter | ((current: RencanaFilter) => RencanaFilter)) => {
    const value = typeof next === "function" ? next(latest.current) : next;
    latest.current = value;
    setFilterState(value);
    const query = filterToParams(value, activePeriod, sasaranList).toString();
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  };
  const clickFilter = (label: string, key: "tahun" | "muatan" | "sasaran" | "status", value: string) => {
    const before = latest.current;
    const adding = !before[key].includes(value);
    setFilter((c) => ({ ...c, [key]: toggle(c[key], value) }));
    if (adding) toast("Filter diterapkan", { description: label, action: { label: "Urungkan", onClick: () => setFilter(before) } });
  };

  const rows = useMemo(() => filterRencana(all, filter).sort((a, b) => a.year - b.year || a.name.localeCompare(b.name)), [all, filter]);
  const withoutTahun = useMemo(() => filterRencana(all, filter, { except: "tahun" }), [all, filter]);
  const withoutMuatan = useMemo(() => filterRencana(all, filter, { except: "muatan" }), [all, filter]);
  const withoutSasaran = useMemo(() => filterRencana(all, filter, { except: "sasaran" }), [all, filter]);
  const years = yearsOf(filter.period);
  const indicators = useMemo(() => source.indicators.filter((i) => i.period === filter.period), [source, filter.period]);

  const count = (status: Rencana["status"]) => rows.filter((r) => r.status === status).length;
  const terlaksana = count("terlaksana");
  const dialihkan = rows.filter((r) => r.source === "usulan_tertunda").length;
  const yearStats: YearStat[] = years.map((year) => {
    const list = withoutTahun.filter((r) => String(r.year) === year);
    const muatan: Partial<Record<Muatan, number>> = {};
    for (const r of list) muatan[r.muatan] = (muatan[r.muatan] ?? 0) + 1;
    return { year, total: list.length, terlaksana: list.filter((r) => r.status === "terlaksana").length, muatan };
  });
  const muatanCounts = muatanKeys.map((k) => [k, withoutMuatan.filter((r) => r.muatan === k).length] as [Muatan, number]).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);

  const active = activeFilterCount(filter, activePeriod);
  const removeFrom = (key: "pd" | "tahun" | "sasaran" | "muatan" | "status", code: string) => () => setFilter((c) => ({ ...c, [key]: c[key].filter((v) => v !== code) }));
  const chips: Chip[] = [
    ...filter.tahun.map((code) => ({ id: `tahun:${code}`, group: "Tahun", label: code, onRemove: removeFrom("tahun", code) })),
    ...filter.pd.map((code) => ({ id: `pd:${code}`, group: "PD", label: pdName(code), onRemove: removeFrom("pd", code) })),
    ...filter.sasaran.map((code) => ({ id: `sasaran:${code}`, group: "Sasaran", label: code.length > 48 ? `${code.slice(0, 46)}…` : code, onRemove: removeFrom("sasaran", code) })),
    ...filter.muatan.map((code) => ({ id: `muatan:${code}`, group: "Muatan", label: muatanConfig[code as Muatan].label, onRemove: removeFrom("muatan", code) })),
    ...filter.status.map((code) => ({ id: `status:${code}`, group: "Status", label: statusConfig[code as Rencana["status"]].label, onRemove: removeFrom("status", code) })),
    ...(filter.period !== activePeriod ? [{ id: "period", group: "Periode", label: filter.period, onRemove: () => setFilter((c) => ({ ...c, period: activePeriod, tahun: [] })) }] : []),
  ];

  return (
    <Reveal className="grid gap-5">
      <ExploreHint
        sample={sample}
        storageKey="spbe:peta-rencana-hint"
        illustration="roadmap"
        tips={[
          "Klik tonggak tahun, petak muatan, atau batang grafik untuk memfilter seluruh dashboard.",
          "Klik sasaran strategis untuk melihat inisiatif, indikator, dan target tiap tahun.",
          "Atur kolom katalog lewat menu Kolom; klik baris untuk evaluasi & realisasi kegiatan.",
        ]}
      />
      <FilterBar
        filters={[
          { label: "Periode", required: true, options: [...periods], value: filter.period, onChange: (period) => setFilter((c) => ({ ...c, period, tahun: [] })) },
          { label: "Tahun", multiple: true, options: years, values: filter.tahun, onValuesChange: (tahun) => setFilter((c) => ({ ...c, tahun })) },
          { label: "PD", wide: true, multiple: true, searchable: true, options: pdOptions, values: filter.pd, onValuesChange: (pd) => setFilter((c) => ({ ...c, pd })) },
          { label: "Sasaran", wide: true, multiple: true, searchable: true, options: sasaranList, values: filter.sasaran, onValuesChange: (sasaran) => setFilter((c) => ({ ...c, sasaran })) },
          { label: "Muatan", multiple: true, options: muatanOptions, values: filter.muatan, onValuesChange: (muatan) => setFilter((c) => ({ ...c, muatan })) },
          { label: "Status", multiple: true, options: statusOptions, values: filter.status, onValuesChange: (status) => setFilter((c) => ({ ...c, status })) },
        ]}
        actions={
          <Button variant="ghost" disabled={!active} onClick={() => setFilter(emptyFilter(activePeriod))} className="shrink-0">
            <Icon icon={FilterResetIcon} size={16} />
            Reset{active > 0 && <Badge variant="secondary" className="tabular-nums">{active}</Badge>}
          </Button>
        }
      >
        <FilterChips chips={chips} />
      </FilterBar>

      {rows.length === 0 ? (
        <Card data-reveal>
          <EmptyState illustration="filter-empty" title="Tidak ada kegiatan" description="Tidak ada kegiatan rencana yang cocok dengan kombinasi filter ini.">
            <Button variant="outline" onClick={() => setFilter(emptyFilter(activePeriod))}>Reset filter</Button>
          </EmptyState>
        </Card>
      ) : (
        <>
          <StatRow>
            <StatCard tone="teal" label="Total kegiatan" value={rows.length} hint={`${new Set(rows.map((r) => r.program)).size} program`} />
            <StatCard tone="amber" label="Terlaksana" value={terlaksana} hint={`${Math.round((terlaksana / rows.length) * 100)}% dari rencana`} />
            <StatCard tone="yellow" label="Berjalan" value={count("berjalan")} />
            <StatCard tone="orange" label="Ditunda" value={count("ditunda")} hint={`${fmt.format(dialihkan)} dialihkan ke tahun berikutnya`} />
            <StatCard tone="sky" label="Perangkat daerah" value={new Set(rows.map((r) => r.opd)).size} hint={`dari ${perangkatDaerah.length} PD`} />
          </StatRow>

          <section className="grid gap-5 *:min-w-0 xl:grid-cols-[1fr_18rem]">
            <YearTrack stats={yearStats} current={currentYear} selected={filter.tahun} onToggle={(y) => clickFilter(`Tahun ${y}`, "tahun", y)} />
            <Card data-reveal className="gap-3">
              <CardHeader>
                <CardTitle className="section-title">Progres terlaksana</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 items-center">
                <Gauge value={Math.round((terlaksana / rows.length) * 100)} label="Kegiatan terlaksana" caption={`${fmt.format(terlaksana)} dari ${fmt.format(rows.length)} kegiatan`} className="w-full" />
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-5 *:min-w-0 xl:grid-cols-[1fr_1.1fr]">
            <div data-aos="fade-blur" suppressHydrationWarning>
              <MuatanBento counts={muatanCounts} selected={filter.muatan} onToggle={(k) => clickFilter(muatanConfig[k].label, "muatan", k)} className="h-full" />
            </div>
            <Card data-reveal className="gap-3">
              <CardHeader>
                <CardTitle className="section-title">Status per tahun</CardTitle>
              </CardHeader>
              <CardContent className="min-h-72 flex-1">
                <BarChart
                  stacked
                  labels={years}
                  series={statusKeys.map((k) => ({ label: statusConfig[k].label, color: statusConfig[k].tone, data: years.map((y) => withoutTahun.filter((r) => r.status === k && String(r.year) === y).length) }))}
                  selected={years.flatMap((y, label) => (filter.tahun.includes(y) ? statusKeys.map((_, series) => ({ label, series })) : []))}
                  onSelect={(label) => clickFilter(`Tahun ${years[label]}`, "tahun", years[label]!)}
                />
              </CardContent>
            </Card>
          </section>

          <div data-aos="fade-blur" suppressHydrationWarning>
            <SasaranPanel rows={withoutSasaran} indicators={indicators} years={years} selected={filter.sasaran} onFilter={(s) => clickFilter(s, "sasaran", s)} />
          </div>

          <DataTable
            title="Katalog peta rencana"
            rows={rows}
            rowId={(r) => `${r.period}:${r.id}`}
            searchText={(r) => `${r.id} ${r.name} ${r.program ?? ""} ${r.inisiatif ?? ""} ${pdName(r.opd)}`}
            searchPlaceholder="Cari kegiatan, program, atau PD"
            onRowClick={setSelected}
            pageSize={20}
            minWidth={760}
            columns={[
              { header: "Kegiatan", sortValue: (r) => r.name, cell: (r) => <span className="font-semibold">{r.name}</span> },
              { header: "PD", sortValue: (r) => pdName(r.opd), cell: (r) => pdName(r.opd) },
              { header: "Tahun", className: "tabular-nums", sortValue: (r) => r.year, cell: (r) => r.year },
              { header: "Status", sortValue: (r) => statusKeys.indexOf(r.status), cell: (r) => <RencanaStatus status={r.status} /> },
              { header: "Muatan", hideable: true, defaultHidden: true, sortValue: (r) => r.muatan, cell: (r) => <ToneBadge tone={muatanConfig[r.muatan].tone}>{muatanConfig[r.muatan].label}</ToneBadge> },
              { header: "Sasaran", hideable: true, defaultHidden: true, sortValue: (r) => r.sasaran, cell: (r) => <span className="line-clamp-2">{r.sasaran}</span> },
              { header: "Inisiatif", hideable: true, defaultHidden: true, sortValue: (r) => r.inisiatif ?? "", cell: (r) => r.inisiatif ?? "—" },
              { header: "Program", hideable: true, defaultHidden: true, sortValue: (r) => r.program ?? "", cell: (r) => r.program ?? "—" },
              { header: "Target", hideable: true, defaultHidden: true, cell: (r) => r.target ?? "—" },
              { header: "Realisasi", hideable: true, defaultHidden: true, cell: (r) => r.realisasi ?? "—" },
            ]}
          />
        </>
      )}

      {selected && (
        <DetailDialog open onOpenChange={(open) => !open && setSelected(null)} eyebrow={selected.id} title={selected.name} meta={rencanaMeta({ ...selected, opdName: pdName(selected.opd) })}>
          <RencanaBody r={{ ...selected, opdName: pdName(selected.opd) }} />
        </DetailDialog>
      )}
    </Reveal>
  );
}
