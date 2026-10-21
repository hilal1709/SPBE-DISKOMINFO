"use client";
import { useMemo, useRef, useState } from "react";
import { useUrlParams } from "@/hooks/use-url-params";
import { FilterResetIcon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { DataTable } from "@/components/blocks/data-table";
import { DetailDialog, DetailField, DetailSection } from "@/components/blocks/detail-dialog";
import { EmptyState } from "@/components/blocks/empty-state";
import { FilterBar } from "@/components/blocks/filter-bar";
import { FilterChips, type Chip } from "@/components/blocks/filter-chips";
import { Gauge } from "@/components/blocks/gauge";
import { StatCard } from "@/components/blocks/stat-card";
import { StatRow } from "@/components/blocks/stat-row";
import { ToneBadge } from "@/components/blocks/status-badge";
import { Treemap } from "@/components/blocks/treemap";
import { BarChart } from "@/components/charts";
import { CycleRingCard } from "@/components/dashboards/keamanan/cycle-ring";
import { ExploreHint } from "@/components/dashboards/probis/explore-hint";
import { Icon } from "@/components/icon";
import { kegiatanEntries, tanggalText } from "@/components/keamanan/kegiatan";
import { Meter } from "@/components/motion/meter";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { kegiatanConfig, kegiatanKeys, kegiatanOptions, masihBerlaku, type Kegiatan } from "@/lib/keamanan/jenis";
import { activeFilterCount, emptyFilter, filterFromParams, filterKeamanan, filterToParams, sanitizeFilter, yearsOf, type KeamananFilter } from "@/lib/keamanan/query";
import type { Coverage, CoverageDomain } from "@/lib/keamanan/repo";
import { toneBgClass } from "@/lib/palette";
import { pdByCode, perangkatDaerah, type PeriodOptions } from "@/lib/probis/reference";
import type { KegiatanKeamanan } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatNumber, percent } from "@/lib/format";

const pdName = (code: string) => pdByCode.get(code)?.name ?? code;
const pdOptions = perangkatDaerah.map((pd) => ({ value: pd.code, label: pd.name }));
const toggle = (list: string[], value: string) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
const domainLabel: Record<CoverageDomain, string> = { data: "data", aplikasi: "aplikasi", infrastruktur: "infrastruktur" };
const byDate = (a: KegiatanKeamanan, b: KegiatanKeamanan) => (b.tanggal ?? "").localeCompare(a.tanggal ?? "");

/** Dashboard publik Domain Keamanan. Semua widget mengikuti filter aktif. */
export function KeamananDashboard({
  data,
  coverage: coverageFromDb,
  sample,
  periods: { periods, active: activePeriod },
}: {
  /** Kegiatan tervalidasi dari database; null = data contoh bawaan. */
  data: KegiatanKeamanan[];
  /** Dependensi keamanan yang diisi data/aplikasi/infrastruktur tervalidasi; null = contoh. */
  coverage: Coverage;
  sample: boolean;
  periods: PeriodOptions;
}) {
  const params = useUrlParams();
  const all = data;
  const coverageAll = coverageFromDb;
  const [filter, setFilterState] = useState<KeamananFilter>(() =>
    sanitizeFilter(filterFromParams(new URLSearchParams(params.toString()), activePeriod), {
      periods,
      defaultPeriod: activePeriod,
      pd: new Set([...pdByCode.keys(), ...all.map((r) => r.opd)]),
      jenis: new Set(kegiatanKeys),
    }),
  );
  const [selected, setSelected] = useState<KegiatanKeamanan | null>(null);
  const latest = useRef(filter);

  /** Simpan filter di URL agar tampilan bisa dibagikan, tanpa memicu navigasi. */
  const setFilter = (next: KeamananFilter | ((current: KeamananFilter) => KeamananFilter)) => {
    const value = typeof next === "function" ? next(latest.current) : next;
    latest.current = value;
    setFilterState(value);
    const query = filterToParams(value, activePeriod).toString();
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  };
  const clickFilter = (label: string, apply: (current: KeamananFilter) => KeamananFilter, adding: boolean) => {
    const before = latest.current;
    setFilter(apply);
    if (adding) toast("Filter diterapkan", { description: label, action: { label: "Urungkan", onClick: () => setFilter(before) } });
  };
  const toggleJenis = (k: Kegiatan) => clickFilter(kegiatanConfig[k].label, (c) => ({ ...c, jenis: toggle(c.jenis, k) }), !filter.jenis.includes(k));

  const rows = useMemo(() => filterKeamanan(all, filter).sort(byDate), [all, filter]);
  const withoutJenis = useMemo(() => filterKeamanan(all, { ...filter, jenis: [] }), [all, filter]);
  const withoutPd = useMemo(() => filterKeamanan(all, { ...filter, pd: [] }), [all, filter]);
  const withoutTahun = useMemo(() => filterKeamanan(all, { ...filter, tahun: [] }), [all, filter]);
  const years = yearsOf(filter.period);

  const jenisCount = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of withoutJenis) map.set(r.jenis, (map.get(r.jenis) ?? 0) + 1);
    return map;
  }, [withoutJenis]);
  const standar = rows.filter((r) => r.jenis === "standar");
  const berlaku = standar.filter((r) => masihBerlaku(r)).length;
  const insiden = rows.filter((r) => r.jenis === "insiden");
  const scores = insiden.map((r) => Number(r.atribut.kematangan)).filter((n) => Number.isFinite(n));
  const maturity = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const audits = rows.filter((r) => r.jenis === "audit");
  const pdCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of withoutPd) map.set(r.opd, (map.get(r.opd) ?? 0) + 1);
    return [...map].sort((a, b) => b[1] - a[1]);
  }, [withoutPd]);
  const coverage = coverageAll[filter.period];
  const domains = (["data", "aplikasi", "infrastruktur"] as const).filter((d) => (coverage?.totals[d] ?? 0) > 0);

  const active = activeFilterCount(filter, activePeriod);
  const removeFrom = (key: "pd" | "jenis" | "tahun", code: string) => () => setFilter((c) => ({ ...c, [key]: c[key].filter((v) => v !== code) }));
  const chips: Chip[] = [
    ...filter.jenis.map((code) => ({ id: `jenis:${code}`, group: "Kegiatan", label: kegiatanConfig[code as Kegiatan].short, onRemove: removeFrom("jenis", code) })),
    ...filter.pd.map((code) => ({ id: `pd:${code}`, group: "Instansi", label: pdName(code), onRemove: removeFrom("pd", code) })),
    ...filter.tahun.map((code) => ({ id: `tahun:${code}`, group: "Tahun", label: code, onRemove: removeFrom("tahun", code) })),
    ...(filter.period !== activePeriod ? [{ id: "period", group: "Periode", label: filter.period, onRemove: () => setFilter((c) => ({ ...c, period: activePeriod, tahun: [] })) }] : []),
  ];

  return (
    <Reveal className="grid gap-5">
      <ExploreHint
        sample={sample}
        storageKey="spbe:keamanan-hint"
        illustration="security-shield"
        tips={[
          "Klik segmen siklus keamanan, batang tahun, atau petak instansi untuk memfilter seluruh dashboard.",
          "Cakupan dependensi membandingkan kegiatan keamanan dengan data, aplikasi, dan infrastruktur yang bergantung padanya.",
          "Klik baris katalog untuk melihat hasil audit, tindak lanjut, atau nilai kematangan penanganan insiden.",
        ]}
      />
      <FilterBar
        filters={[
          { label: "Kegiatan", wide: true, multiple: true, options: kegiatanOptions, values: filter.jenis, onValuesChange: (jenis) => setFilter((c) => ({ ...c, jenis })) },
          { label: "Instansi", wide: true, multiple: true, searchable: true, options: pdOptions, values: filter.pd, onValuesChange: (pd) => setFilter((c) => ({ ...c, pd })) },
          { label: "Tahun", multiple: true, options: years, values: filter.tahun, onValuesChange: (tahun) => setFilter((c) => ({ ...c, tahun })) },
          { label: "Periode", required: true, options: [...periods], value: filter.period, onChange: (period) => setFilter((c) => ({ ...c, period, tahun: [] })) },
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
          <EmptyState illustration="filter-empty" title="Tidak ada kegiatan" description="Tidak ada kegiatan keamanan yang cocok dengan kombinasi filter ini. Hapus salah satu chip filter atau reset semuanya.">
            <Button variant="outline" onClick={() => setFilter(emptyFilter(activePeriod))}>Reset filter</Button>
          </EmptyState>
        </Card>
      ) : (
        <>
          <StatRow>
            <StatCard tone="teal" label="Kegiatan keamanan" value={rows.length} hint={`${new Set(rows.map((r) => r.jenis)).size} dari 7 jenis kegiatan`} />
            <StatCard tone="orange" label="Standar berlaku" value={berlaku} hint={`dari ${formatNumber(standar.length)} standar & prosedur`} />
            <StatCard tone="yellow" label="Audit keamanan" value={audits.length} hint={`${new Set(audits.map((r) => r.opd)).size} instansi diaudit/mengaudit`} />
            <StatCard tone="amber" label="Insiden ditangani" value={insiden.length} hint={scores.length ? `kematangan rata-rata ${maturity.toFixed(1).replace(".", ",")} dari 5` : "belum ada nilai kematangan"} />
            <StatCard tone="sky" label="Instansi pelaksana" value={new Set(rows.map((r) => r.opd)).size} hint={`dari ${perangkatDaerah.length} Perangkat Daerah`} />
          </StatRow>

          <section className="grid gap-5 *:min-w-0 xl:grid-cols-[1.2fr_1fr]">
            <CycleRingCard counts={jenisCount} selected={filter.jenis} onToggle={toggleJenis} />
            <Card data-reveal className="gap-3">
              <CardHeader>
                <CardTitle as="h2" className="section-title">Kegiatan terbaru</CardTitle>
              </CardHeader>
              <CardContent className="grid flex-1 content-start gap-4">
                {scores.length > 0 && <Gauge value={Math.round((maturity / 5) * 100)} label="Kematangan penanganan insiden" caption={`rata-rata ${maturity.toFixed(1).replace(".", ",")} dari 5 (${formatNumber(scores.length)} insiden)`} />}
                <ol className="relative grid gap-3 border-l pl-4">
                  {rows.slice(0, 5).map((r) => (
                    <li key={r.id} className="relative text-sm">
                      <span aria-hidden className="absolute top-1.5 -left-[1.3rem] size-2.5 rounded-full border-2 border-card" style={{ background: `var(${kegiatanConfig[r.jenis].tone})` }} />
                      <button type="button" onClick={() => setSelected(r)} className="grid text-left hover:underline">
                        <span className="font-medium">{r.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {kegiatanConfig[r.jenis].short} · {tanggalText(r.tanggal)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-5 *:min-w-0 xl:grid-cols-[1.15fr_1fr]">
            <Card data-reveal className="gap-3">
              <CardHeader>
                <CardTitle as="h2" className="section-title">Kegiatan per tahun</CardTitle>
              </CardHeader>
              <CardContent className="min-h-72 flex-1">
                <BarChart
                  stacked
                  labels={years}
                  series={kegiatanKeys.map((k) => ({ label: kegiatanConfig[k].short, color: kegiatanConfig[k].tone, data: years.map((y) => withoutTahun.filter((r) => r.jenis === k && r.tanggal?.startsWith(y)).length) }))}
                  selected={years.flatMap((y, label) => (filter.tahun.includes(y) ? kegiatanKeys.map((_, series) => ({ label, series })) : []))}
                  onSelect={(label) => {
                    const y = years[label]!;
                    clickFilter(`Tahun ${y}`, (c) => ({ ...c, tahun: toggle(c.tahun, y) }), !filter.tahun.includes(y));
                  }}
                />
              </CardContent>
            </Card>
            <div data-aos="fade-blur" suppressHydrationWarning>
              <Card className="h-full gap-3">
                <CardHeader>
                  <CardTitle as="h2" className="section-title">Cakupan dependensi keamanan</CardTitle>
                </CardHeader>
                <CardContent className="grid flex-1 content-start gap-4">
                  {coverage && domains.length ? (
                    <>
                      <p className="text-xs text-muted-foreground">
                        Persentase entri tervalidasi yang mencantumkan tiap kegiatan keamanan: {domains.map((d) => `${formatNumber(coverage.totals[d])} ${domainLabel[d]}`).join(", ")}.
                      </p>
                      {kegiatanKeys.map((k) => {
                        const hit = coverage.byKey[k];
                        const total = domains.reduce((n, d) => n + coverage.totals[d], 0);
                        const sum = domains.reduce((n, d) => n + (hit?.[d] ?? 0), 0);
                        return (
                          <div key={k} className="grid gap-1.5">
                            <div className="flex items-baseline justify-between gap-3 text-sm">
                              <span className="font-medium">{kegiatanConfig[k].short}</span>
                              <span className="text-xs text-muted-foreground tabular-nums">{domains.map((d) => `${domainLabel[d]} ${percent(hit?.[d] ?? 0, coverage.totals[d])}%`).join(" · ")}</span>
                            </div>
                            <Meter value={percent(sum, total)} label={`Cakupan ${kegiatanConfig[k].short}`} indicatorClassName={toneBgClass[kegiatanConfig[k].tone]} />
                          </div>
                        );
                      })}
                    </>
                  ) : (
                    <EmptyState illustration="security-shield" title="Belum ada dependensi" description="Data, aplikasi, dan infrastruktur tervalidasi belum mencantumkan dependensi keamanan." />
                  )}
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="grid gap-5 *:min-w-0 xl:grid-cols-[1fr_1.2fr]">
            <div data-aos="fade-blur" suppressHydrationWarning>
              <Card className="h-full gap-3">
                <CardHeader>
                  <CardTitle as="h2" className="section-title">Standar & prosedur</CardTitle>
                </CardHeader>
                <CardContent className="grid max-h-[26rem] content-start gap-2 overflow-y-auto">
                  {standar.length ? (
                    standar.map((r) => (
                      <button key={r.id} type="button" onClick={() => setSelected(r)} className="flex items-start justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:bg-accent">
                        <span className="grid gap-0.5">
                          <span className="font-medium">{r.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {r.atribut.jenis ?? "Standar"} · sejak {tanggalText(r.tanggal)}
                          </span>
                        </span>
                        <Badge variant={masihBerlaku(r) ? "success" : "muted"} className="shrink-0">
                          {masihBerlaku(r) ? "Berlaku" : "Berakhir"}
                        </Badge>
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Tidak ada standar pada filter ini.</p>
                  )}
                </CardContent>
              </Card>
            </div>
            <Card data-reveal className="gap-3">
              <CardHeader>
                <CardTitle as="h2" className="section-title">Kegiatan per instansi</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <Treemap
                  items={pdCounts.map(([code, value]) => ({ code, label: pdName(code), value }))}
                  selected={filter.pd}
                  onToggle={(code) => clickFilter(pdName(code), (c) => ({ ...c, pd: toggle(c.pd, code) }), !filter.pd.includes(code))}
                  className="min-h-80 flex-1"
                />
              </CardContent>
            </Card>
          </section>

          <DataTable
            title="Katalog kegiatan keamanan"
            rows={rows}
            rowId={(r) => r.id}
            searchText={(r) => `${r.id} ${r.name} ${r.deskripsi ?? ""} ${kegiatanConfig[r.jenis].label}`}
            searchPlaceholder="Cari nama, ID, atau deskripsi"
            onRowClick={setSelected}
            pageSize={20}
            minWidth={820}
            columns={[
              { header: "ID", className: "whitespace-nowrap", sortValue: (r) => r.id, cell: (r) => <span className="font-medium text-muted-foreground tabular-nums">{r.id}</span> },
              { header: "Nama kegiatan", sortValue: (r) => r.name, cell: (r) => <span className="font-semibold">{r.name}</span> },
              { header: "Kegiatan", sortValue: (r) => r.jenis, cell: (r) => <ToneBadge tone={kegiatanConfig[r.jenis].tone}>{kegiatanConfig[r.jenis].short}</ToneBadge> },
              { header: "Tanggal", sortValue: (r) => r.tanggal ?? "", cell: (r) => <span className="whitespace-nowrap text-muted-foreground">{tanggalText(r.tanggal)}</span> },
              { header: "Instansi", hideable: true, sortValue: (r) => pdName(r.opd), cell: (r) => pdName(r.opd) },
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
              <ToneBadge tone={kegiatanConfig[selected.jenis].tone}>{kegiatanConfig[selected.jenis].short}</ToneBadge>
              {selected.jenis === "standar" && <Badge variant={masihBerlaku(selected) ? "success" : "muted"}>{masihBerlaku(selected) ? "Berlaku" : "Berakhir"}</Badge>}
            </>
          }
        >
          {selected.deskripsi && (
            <DetailSection title="Deskripsi" tone="accent">
              <p className="text-sm leading-relaxed">{selected.deskripsi}</p>
            </DetailSection>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            <DetailField label={kegiatanConfig[selected.jenis].dateLabel} value={tanggalText(selected.tanggal)} />
            <DetailField label="Instansi" value={pdName(selected.opd)} />
            {kegiatanEntries(selected).map((e) => (
              <DetailField key={e.label} label={e.label} value={e.value} className={cn(e.wide && "sm:col-span-2")} />
            ))}
          </div>
        </DetailDialog>
      )}
    </Reveal>
  );
}
