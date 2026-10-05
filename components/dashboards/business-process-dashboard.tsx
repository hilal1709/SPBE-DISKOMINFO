"use client";
import { useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FilterResetIcon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { DataTable } from "@/components/blocks/data-table";
import { DetailDialog, DetailField, DetailSection } from "@/components/blocks/detail-dialog";
import { EmptyState } from "@/components/blocks/empty-state";
import { FilterBar } from "@/components/blocks/filter-bar";
import { FilterChips, type Chip } from "@/components/blocks/filter-chips";
import { StatCard } from "@/components/blocks/stat-card";
import { StatusBadge } from "@/components/blocks/status-badge";
import { Treemap } from "@/components/blocks/treemap";
import { ExploreHint } from "@/components/dashboards/probis/explore-hint";
import { PdRankingCard, type PdRow } from "@/components/dashboards/probis/pd-ranking";
import { RabTreeCard } from "@/components/dashboards/probis/rab-tree";
import { Icon } from "@/components/icon";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { colorByCount } from "@/lib/palette";
import { allProbis } from "@/lib/probis/generate";
import { activeFilterCount, countBy, emptyFilter, filterFromParams, filterProbis, filterToParams, rabOptions, rabTree, type ProbisFilter } from "@/lib/probis/query";
import { useRabSet } from "@/components/probis/rab-context";
import type { RabIndex } from "@/lib/probis/rab-index";
import { pdByCode, perangkatDaerah, statusLabel, statusOptions, type PeriodOptions } from "@/lib/probis/reference";
import type { Probis } from "@/lib/types";

const fmt = new Intl.NumberFormat("id-ID");
const pdName = (code: string) => pdByCode.get(code)?.name ?? code;
const pdOptions = perangkatDaerah.map((pd) => ({ value: pd.code, label: pd.name }));
const toOptions = (nodes: { code: string; name: string }[]) => nodes.map((n) => ({ value: n.code, label: `${n.code} ${n.name}` }));
const toggle = (list: string[], value: string) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

/** RAB bertingkat: buang pilihan turunan yang tidak lagi berada di bawah induk terpilih. */
type RabKey = "rab1" | "rab2" | "rab3" | "rab4" | "rab5";

function withRab(current: ProbisFilter, patch: Partial<Pick<ProbisFilter, RabKey>>, rab: RabIndex) {
  const next = { ...current, ...patch };
  for (const [key, level] of [["rab2", "level2"], ["rab3", "level3"], ["rab4", "level4"], ["rab5", "level5"]] as const) {
    const allowed = new Set(rabOptions(next, rab)[level].map((n) => n.code));
    next[key] = next[key].filter((c) => allowed.has(c));
  }
  return next;
}

/** Dashboard publik Domain Proses Bisnis (beranda portal). Semua widget mengikuti filter aktif. */
export function BusinessProcessDashboard({
  data,
  sample,
  periods: { periods, active: activePeriod },
}: {
  /** Probis tervalidasi dari database; null = data contoh bawaan. */
  data: Probis[] | null;
  /** Data yang tampil masih data contoh. */
  sample: boolean;
  periods: PeriodOptions;
}) {
  const params = useSearchParams();
  const rabs = useRabSet();
  const [filter, setFilterState] = useState<ProbisFilter>(() => filterFromParams(new URLSearchParams(params.toString()), activePeriod));
  const [selected, setSelected] = useState<Probis | null>(null);
  /** Filter terbaru, untuk aksi tertunda (animasi chip, Urungkan di toast). */
  const latest = useRef(filter);

  /** Simpan filter di URL agar tampilan bisa dibagikan, tanpa memicu navigasi. */
  const setFilter = (next: ProbisFilter | ((current: ProbisFilter) => ProbisFilter)) => {
    const value = typeof next === "function" ? next(latest.current) : next;
    latest.current = value;
    setFilterState(value);
    const query = filterToParams(value, activePeriod).toString();
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  };

  const setRab = (patch: Partial<Pick<ProbisFilter, RabKey>>) => setFilter((current) => withRab(current, patch, rabs.forPeriod(current.period)));

  /** Klik petak/baris: filter langsung diterapkan, toast menawarkan Urungkan. */
  const clickFilter = (label: string, apply: (current: ProbisFilter) => ProbisFilter, adding: boolean) => {
    const before = latest.current;
    setFilter(apply);
    if (adding) toast("Filter diterapkan", { description: label, action: { label: "Urungkan", onClick: () => setFilter(before) } });
  };

  const all = useMemo(() => data ?? allProbis(), [data]);

  const rows = useMemo(() => filterProbis(all, filter), [all, filter]);
  /** Widget yang juga berfungsi sebagai filter memakai data tanpa filternya sendiri, agar pilihan lain tetap terlihat. */
  const withoutRab1 = useMemo(() => filterProbis(all, { ...filter, rab1: [] }), [all, filter]);
  const withoutRab2 = useMemo(() => filterProbis(all, { ...filter, rab2: [] }), [all, filter]);
  const withoutPd = useMemo(() => filterProbis(all, { ...filter, pd: [] }), [all, filter]);

  /** Referensi RAB mengikuti versi milik periode yang dipilih. */
  const rab = useMemo(() => rabs.forPeriod(filter.period), [rabs, filter.period]);
  const rabLabel = rab.label;
  const options = rabOptions(filter, rab);
  /** Satu warna per sektor (RAB 1), dipakai sama di rekap, treemap, dan ranking. */
  const sectorColor = useMemo(() => colorByCount(all, (p) => p.rab1), [all]);
  /** Kolom/filter L4/L5 tampil hanya bila ada data yang memakainya. */
  const deep = useMemo(() => ({ rab4: all.some((p) => p.rab4), rab5: all.some((p) => p.rab5) }), [all]);
  const statusCount = countBy(rows, "status");
  const pdCount = countBy(rows, "pd").size;
  const tree = useMemo(() => rabTree(rows, rab), [rows, rab]);
  const sektor = [...countBy(withoutRab1, "rab1")].map(([code, value]) => ({ code, value, label: rab.byCode.get(code)?.name ?? code }));
  const urusan = [...countBy(withoutRab2, "rab2")].map(([code, value]) => ({ code, value, label: rab.byCode.get(code)?.name ?? code }));
  const pdRows = useMemo<PdRow[]>(() => {
    const groups = new Map<string, Probis[]>();
    for (const p of withoutPd) groups.set(p.pd, [...(groups.get(p.pd) ?? []), p]);
    return [...groups]
      .map(([code, list]) => ({ code, name: pdName(code), count: list.length, sektor: [...countBy(list, "rab1")].sort((a, b) => b[1] - a[1]) }))
      .sort((a, b) => b.count - a.count);
  }, [withoutPd]);
  const active = activeFilterCount(filter, activePeriod);
  const chips: Chip[] = [
    ...filter.pd.map((code) => ({ id: `pd:${code}`, group: "PD", label: pdName(code), onRemove: () => setFilter((c) => ({ ...c, pd: c.pd.filter((v) => v !== code) })) })),
    ...filter.status.map((code) => ({ id: `status:${code}`, group: "Status", label: statusLabel[code as keyof typeof statusLabel], onRemove: () => setFilter((c) => ({ ...c, status: c.status.filter((v) => v !== code) })) })),
    ...(filter.period !== activePeriod ? [{ id: "period", group: "Periode", label: filter.period, onRemove: () => setFilter((c) => ({ ...c, period: activePeriod })) }] : []),
    ...(["rab1", "rab2", "rab3", "rab4", "rab5"] as const).flatMap((key, i) =>
      filter[key].map((code) => ({ id: `${key}:${code}`, group: `RAB ${i + 1}`, label: rabLabel(code), onRemove: () => setRab({ [key]: latest.current[key].filter((v) => v !== code) }) })),
    ),
  ];

  return (
    <Reveal className="grid gap-5">
      <ExploreHint sample={sample} />
      <FilterBar
        filters={[
          { label: "Perangkat Daerah", wide: true, multiple: true, searchable: true, options: pdOptions, values: filter.pd, onValuesChange: (pd) => setFilter((c) => ({ ...c, pd })) },
          { label: "Status", multiple: true, options: statusOptions, values: filter.status, onValuesChange: (status) => setFilter((c) => ({ ...c, status })) },
          { label: "Periode", required: true, options: [...periods], value: filter.period, onChange: (period) => setFilter((c) => ({ ...c, period })) },
          { label: "RAB 1", multiple: true, searchable: true, options: toOptions(options.level1), values: filter.rab1, onValuesChange: (rab1) => setRab({ rab1 }) },
          { label: "RAB 2", multiple: true, searchable: true, options: toOptions(options.level2), values: filter.rab2, onValuesChange: (rab2) => setRab({ rab2 }) },
          { label: "RAB 3", multiple: true, searchable: true, options: toOptions(options.level3), values: filter.rab3, onValuesChange: (rab3) => setRab({ rab3 }) },
          // RAB 4/5 hanya muncul bila datanya sudah memakai referensi L4/L5.
          ...(deep.rab4 ? [{ label: "RAB 4", multiple: true, searchable: true, options: toOptions(options.level4), values: filter.rab4, onValuesChange: (rab4: string[]) => setRab({ rab4 }) }] : []),
          ...(deep.rab5 ? [{ label: "RAB 5", multiple: true, searchable: true, options: toOptions(options.level5), values: filter.rab5, onValuesChange: (rab5: string[]) => setRab({ rab5 }) }] : []),
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
          <EmptyState illustration="filter-empty" title="Tidak ada proses bisnis" description="Tidak ada data yang cocok dengan kombinasi filter ini. Hapus salah satu chip filter atau reset semuanya.">
            <Button variant="outline" onClick={() => setFilter(emptyFilter(activePeriod))}>Reset filter</Button>
          </EmptyState>
        </Card>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard tone="teal" label="Jumlah proses bisnis" value={rows.length} hint={`${fmt.format(statusCount.get("as_is") ?? 0)} AS-IS`} />
            <StatCard tone="orange" label="Perangkat Daerah pemilik" value={pdCount} hint={`dari ${perangkatDaerah.length} Perangkat Daerah`} />
            <StatCard tone="yellow" label="Rencana upgrade" value={statusCount.get("upgrade") ?? 0} hint="pengembangan dari AS-IS" />
            <StatCard tone="amber" label="Probis baru" value={statusCount.get("new") ?? 0} hint={`${tree.length} sektor RAB terisi`} />
          </section>

          <section className="grid gap-5 *:min-w-0 xl:grid-cols-[1fr_1.15fr]">
            <RabTreeCard tree={tree} total={rows.length} colorOf={sectorColor} />
            <Card data-reveal className="gap-3">
              <CardHeader>
                <CardTitle className="section-title">Sektor pemerintahan (RAB 1)</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <Treemap items={sektor} colorOf={(item) => sectorColor(item.code)} selected={filter.rab1} onToggle={(code) => clickFilter(rabLabel(code), (c) => withRab(c, { rab1: toggle(c.rab1, code) }, rab), !filter.rab1.includes(code))} className="min-h-80 flex-1" />
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-5 *:min-w-0 xl:grid-cols-[1fr_1.4fr]">
            <PdRankingCard label={rabLabel} rows={pdRows} colorOf={sectorColor} selected={filter.pd} onToggle={(code) => clickFilter(pdName(code), (c) => ({ ...c, pd: toggle(c.pd, code) }), !filter.pd.includes(code))} />
            <Card data-reveal className="gap-3">
              <CardHeader>
                <CardTitle className="section-title">Urusan pemerintahan (RAB 2)</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <Treemap items={urusan} colorOf={(item) => sectorColor(rab.byCode.get(item.code)?.parent)} selected={filter.rab2} onToggle={(code) => clickFilter(rabLabel(code), (c) => withRab(c, { rab2: toggle(c.rab2, code) }, rab), !filter.rab2.includes(code))} className="min-h-[26rem] flex-1" />
              </CardContent>
            </Card>
          </section>

          <DataTable
            title="Katalog proses bisnis"
            rows={rows}
            rowId={(p) => p.id}
            searchText={(p) => `${p.id} ${p.name}`}
            searchPlaceholder="Cari nama atau ID probis"
            onRowClick={setSelected}
            pageSize={20}
            minWidth={900}
            columns={[
              { header: "ID Probis", className: "whitespace-nowrap", sortValue: (p) => p.id, cell: (p) => <span className="font-medium text-muted-foreground tabular-nums">{p.id}</span> },
              { header: "Nama proses bisnis", sortValue: (p) => p.name, cell: (p) => <span className="font-semibold">{p.name}</span> },
              { header: "Status", hideable: true, sortValue: (p) => statusLabel[p.status], cell: (p) => <StatusBadge status={statusLabel[p.status]} /> },
              { header: "Perangkat Daerah", hideable: true, sortValue: (p) => pdName(p.pd), cell: (p) => pdName(p.pd) },
              { header: "Sasaran strategis", hideable: true, defaultHidden: true, sortValue: (p) => p.sasaran, cell: (p) => <span className="line-clamp-2 text-muted-foreground">{p.sasaran}</span> },
              { header: "RAB 1", hideable: true, defaultHidden: true, sortValue: (p) => p.rab1, cell: (p) => <span className="text-muted-foreground">{rabLabel(p.rab1)}</span> },
              { header: "RAB 2", hideable: true, defaultHidden: true, sortValue: (p) => p.rab2, cell: (p) => <span className="text-muted-foreground">{rabLabel(p.rab2)}</span> },
              { header: "RAB 3", hideable: true, sortValue: (p) => p.rab3, cell: (p) => <span className="text-muted-foreground">{rabLabel(p.rab3)}</span> },
              ...(deep.rab4 ? [{ header: "RAB 4", hideable: true, defaultHidden: true, sortValue: (p: Probis) => p.rab4 ?? "", cell: (p: Probis) => <span className="text-muted-foreground">{p.rab4 ? rabLabel(p.rab4) : "—"}</span> }] : []),
              ...(deep.rab5 ? [{ header: "RAB 5", hideable: true, defaultHidden: true, sortValue: (p: Probis) => p.rab5 ?? "", cell: (p: Probis) => <span className="text-muted-foreground">{p.rab5 ? rabLabel(p.rab5) : "—"}</span> }] : []),
            ]}
          />
        </>
      )}

      {selected && (
        <DetailDialog
          open
          onOpenChange={(open) => !open && setSelected(null)}
          eyebrow={selected.id}
          title={selected.name}
          meta={
            <>
              <StatusBadge status={statusLabel[selected.status]} />
              <Badge variant="info">{pdName(selected.pd)}</Badge>
            </>
          }
        >
          <DetailSection title="Uraian" tone="accent">
            <p className="text-sm leading-relaxed text-muted-foreground">{selected.uraian}</p>
          </DetailSection>
          <DetailSection title="Klasifikasi RAB">
            <div className="grid gap-2 sm:grid-cols-3">
              {[selected.rab1, selected.rab2, selected.rab3, selected.rab4, selected.rab5].filter((c): c is string => !!c).map((code, i) => (
                <DetailField key={code} label={`Level ${i + 1} · ${code}`} value={rab.byCode.get(code)?.name} />
              ))}
            </div>
          </DetailSection>
          <div className="grid gap-2 sm:grid-cols-2">
            <DetailField label="Sasaran strategis" value={selected.sasaran} className="sm:col-span-2" />
            <DetailField label="Indikator Kinerja Utama" value={selected.iku} />
            <DetailField label="Periode" value={selected.period} />
          </div>
        </DetailDialog>
      )}
    </Reveal>
  );
}
