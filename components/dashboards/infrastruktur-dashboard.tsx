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
import { StatusBadge, ToneBadge } from "@/components/blocks/status-badge";
import { DoughnutChart } from "@/components/charts";
import { LinkMapCard } from "@/components/dashboards/infrastruktur/link-map";
import { ExploreHint } from "@/components/dashboards/probis/explore-hint";
import { PdRankingCard, type PdRow } from "@/components/dashboards/probis/pd-ranking";
import { Icon } from "@/components/icon";
import { RelasiSection, attrEntries } from "@/components/infrastruktur/relasi";
import { useRai } from "@/components/infrastruktur/rai-context";
import { Meter } from "@/components/motion/meter";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatMetric, jenisConfig, jenisKeys, jenisOptions, kepemilikanColor, kepemilikanLabel, kepemilikanOptions, layers, parseMetric,
  type InfraJenis, type InfraKepemilikan,
} from "@/lib/infrastruktur/jenis";
import { activeFilterCount, countBy, emptyFilter, filterFromParams, filterInfra, filterToParams, raiOptions, sanitizeFilter, type InfraFilter } from "@/lib/infrastruktur/query";
import { categoryColor, toneBgClass } from "@/lib/palette";
import { pdByCode, perangkatDaerah, type PeriodOptions } from "@/lib/probis/reference";
import type { Infrastruktur } from "@/lib/types";
import { cn } from "@/lib/utils";

const fmt = new Intl.NumberFormat("id-ID");
const pct = (part: number, whole: number) => Math.round((part / (whole || 1)) * 100);
const pdName = (code: string) => pdByCode.get(code)?.name ?? code;
const pdOptions = perangkatDaerah.map((pd) => ({ value: pd.code, label: pd.name }));
const toOptions = (nodes: { code: string; name: string }[]) => nodes.map((n) => ({ value: n.code, label: `${n.code} ${n.name}` }));
const toggle = (list: string[], value: string) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

/** Jumlahkan kolom khusus bermetrik (mis. kapasitas penyimpanan server + media penyimpan). */
function sumMetric(rows: Infrastruktur[], metric: "storage" | "bandwidth" | "memory", only?: (r: Infrastruktur) => boolean) {
  let total = 0;
  for (const r of rows) {
    if (only && !only(r)) continue;
    for (const a of jenisConfig[r.jenis].attrs) if (a.metric === metric) total += parseMetric(r.atribut[a.key], metric) ?? 0;
  }
  return total;
}

/** Dashboard publik Domain Infrastruktur. Semua widget mengikuti filter aktif. */
export function InfrastrukturDashboard({
  data,
  sample,
  periods: { periods, active: activePeriod },
}: {
  /** Komponen tervalidasi dari database; null = data contoh bawaan. */
  data: Infrastruktur[];
  sample: boolean;
  periods: PeriodOptions;
}) {
  const params = useUrlParams();
  const rai = useRai();
  const all = data;
  const [filter, setFilterState] = useState<InfraFilter>(() =>
    sanitizeFilter(filterFromParams(new URLSearchParams(params.toString()), activePeriod), {
      periods,
      defaultPeriod: activePeriod,
      pd: new Set([...pdByCode.keys(), ...all.map((r) => r.opd)]),
      jenis: new Set(jenisKeys),
      kepemilikan: new Set(Object.keys(kepemilikanLabel)),
      rai,
    }),
  );
  const [selected, setSelected] = useState<Infrastruktur | null>(null);
  /** Filter terbaru, untuk aksi tertunda (Urungkan di toast). */
  const latest = useRef(filter);

  /** Simpan filter di URL agar tampilan bisa dibagikan, tanpa memicu navigasi. */
  const setFilter = (next: InfraFilter | ((current: InfraFilter) => InfraFilter)) => {
    const value = typeof next === "function" ? next(latest.current) : next;
    latest.current = value;
    setFilterState(value);
    const query = filterToParams(value, activePeriod).toString();
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  };
  const setRai1 = (rai1: string[]) => setFilter((c) => ({ ...c, rai1, rai2: c.rai2.filter((code) => !rai1.length || rai1.includes(rai.byCode.get(code)!.parent!)) }));

  /** Klik kartu/simpul/baris: filter langsung diterapkan, toast menawarkan Urungkan. */
  const clickFilter = (label: string, apply: (current: InfraFilter) => InfraFilter, adding: boolean) => {
    const before = latest.current;
    setFilter(apply);
    if (adding) toast("Filter diterapkan", { description: label, action: { label: "Urungkan", onClick: () => setFilter(before) } });
  };
  const toggleJenis = (jenis: InfraJenis) => clickFilter(jenisConfig[jenis].label, (c) => ({ ...c, jenis: toggle(c.jenis, jenis) }), !filter.jenis.includes(jenis));

  const rows = useMemo(() => filterInfra(all, filter), [all, filter]);
  /** Widget yang juga berfungsi sebagai filter memakai data tanpa filternya sendiri, agar pilihan lain tetap terlihat. */
  const withoutJenis = useMemo(() => filterInfra(all, { ...filter, jenis: [] }), [all, filter]);
  const withoutPd = useMemo(() => filterInfra(all, { ...filter, pd: [] }), [all, filter]);
  const withoutOwner = useMemo(() => filterInfra(all, { ...filter, kepemilikan: [] }), [all, filter]);

  const options = raiOptions(filter, rai);
  const total = rows.length;
  const jenisCount = countBy(withoutJenis, "jenis");
  const owner = countBy(withoutOwner, "kepemilikan");
  const owned = [...countBy(rows, "kepemilikan").values()].reduce((a, b) => a + b, 0);
  const storage = sumMetric(rows, "storage");
  const internet = sumMetric(rows, "bandwidth", (r) => r.jenis === "fasilitas");
  const platforms = rows.filter((r) => r.jenis === "platform");
  const openSource = platforms.filter((r) => r.atribut.lisensi === "Open source").length;
  const servers = rows.filter((r) => r.jenis === "server");
  const usage = [...countBy(servers.map((s) => ({ ...s, jenis: (s.atribut.penggunaan ?? "Lainnya") as InfraJenis })), "jenis")].sort((a, b) => b[1] - a[1]);
  const apps = new Set(rows.flatMap((r) => r.aplikasi.map((a) => a.id))).size;
  const pdRows = useMemo<PdRow[]>(() => {
    const groups = new Map<string, Infrastruktur[]>();
    for (const r of withoutPd) groups.set(r.opd, [...(groups.get(r.opd) ?? []), r]);
    return [...groups]
      .map(([code, list]) => ({ code, name: pdName(code), count: list.length, sektor: [...countBy(list, "jenis")].sort((a, b) => b[1] - a[1]) }))
      .sort((a, b) => b.count - a.count);
  }, [withoutPd]);

  const active = activeFilterCount(filter, activePeriod);
  const removeFrom = (key: "pd" | "jenis" | "kepemilikan" | "rai2", code: string) => () => setFilter((c) => ({ ...c, [key]: c[key].filter((v) => v !== code) }));
  const chips: Chip[] = [
    ...filter.jenis.map((code) => ({ id: `jenis:${code}`, group: "Komponen", label: jenisConfig[code as InfraJenis].short, onRemove: removeFrom("jenis", code) })),
    ...filter.pd.map((code) => ({ id: `pd:${code}`, group: "Instansi", label: pdName(code), onRemove: removeFrom("pd", code) })),
    ...filter.kepemilikan.map((code) => ({ id: `kep:${code}`, group: "Kepemilikan", label: kepemilikanLabel[code as InfraKepemilikan], onRemove: removeFrom("kepemilikan", code) })),
    ...(filter.period !== activePeriod ? [{ id: "period", group: "Periode", label: filter.period, onRemove: () => setFilter((c) => ({ ...c, period: activePeriod })) }] : []),
    ...filter.rai1.map((code) => ({ id: `rai1:${code}`, group: "RAI 1", label: rai.label(code), onRemove: () => setRai1(latest.current.rai1.filter((v) => v !== code)) })),
    ...filter.rai2.map((code) => ({ id: `rai2:${code}`, group: "RAI 2", label: rai.label(code), onRemove: removeFrom("rai2", code) })),
  ];

  return (
    <Reveal className="grid gap-5">
      <ExploreHint
        sample={sample}
        storageKey="spbe:infrastruktur-hint"
        illustration="data-center"
        tips={[
          "Klik kartu komponen di peta lapisan atau simpul di peta keterhubungan untuk memfilter seluruh dashboard.",
          "Peta keterhubungan menunjukkan aplikasi dan data yang berjalan di atas SPLP, cloud, server, hingga data center.",
          "Klik baris katalog untuk melihat spesifikasi, relasi, dan dependensi keamanan tiap komponen.",
        ]}
      />
      <FilterBar
        filters={[
          { label: "Komponen", wide: true, multiple: true, options: jenisOptions, values: filter.jenis, onValuesChange: (jenis) => setFilter((c) => ({ ...c, jenis })) },
          { label: "Instansi", wide: true, multiple: true, searchable: true, options: pdOptions, values: filter.pd, onValuesChange: (pd) => setFilter((c) => ({ ...c, pd })) },
          { label: "Kepemilikan", multiple: true, options: [...kepemilikanOptions], values: filter.kepemilikan, onValuesChange: (kepemilikan) => setFilter((c) => ({ ...c, kepemilikan })) },
          { label: "Periode", required: true, options: [...periods], value: filter.period, onChange: (period) => setFilter((c) => ({ ...c, period })) },
          { label: "RAI 1", multiple: true, options: toOptions(options.level1), values: filter.rai1, onValuesChange: setRai1 },
          { label: "RAI 2", multiple: true, options: toOptions(options.level2), values: filter.rai2, onValuesChange: (rai2) => setFilter((c) => ({ ...c, rai2 })) },
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
          <EmptyState illustration="filter-empty" title="Tidak ada komponen" description="Tidak ada komponen infrastruktur yang cocok dengan kombinasi filter ini. Hapus salah satu chip filter atau reset semuanya.">
            <Button variant="outline" onClick={() => setFilter(emptyFilter(activePeriod))}>Reset filter</Button>
          </EmptyState>
        </Card>
      ) : (
        <>
          <StatRow>
            <StatCard tone="teal" label="Komponen infrastruktur" value={total} hint={`${countBy(rows, "jenis").size} dari 10 jenis komponen`} />
            <StatCard tone="orange" label="Kapasitas penyimpanan" value={Math.round(storage / 1024)} suffix=" TB" hint="server dan media penyimpan" />
            <StatCard tone="yellow" label="Bandwidth internet" value={internet / 1000} decimals={1} suffix=" Gbps" hint="seluruh fasilitas komputasi" />
            <StatCard tone="amber" label="Milik sendiri" value={pct(rows.filter((r) => r.kepemilikan === "milik_sendiri").length, owned)} suffix="%" hint={`${fmt.format(owned)} komponen berstatus kepemilikan`} />
            <StatCard tone="sky" label="Aplikasi terlayani" value={apps} hint={`oleh ${countBy(rows, "opd").size} instansi pemilik komponen`} />
          </StatRow>

          {/* Peta lapisan RAI L1: kartu komponen sekaligus filter (klik untuk memilih). */}
          <section className="grid gap-5 *:min-w-0 lg:grid-cols-3" aria-label="Peta lapisan infrastruktur">
            {layers.map((layer, li) => {
              const max = Math.max(1, ...layer.jenis.map((k) => jenisCount.get(k) ?? 0));
              const sum = layer.jenis.reduce((n, k) => n + (jenisCount.get(k) ?? 0), 0);
              return (
                <div key={layer.code} data-aos="fade-blur" data-aos-delay={li * 80} suppressHydrationWarning>
                  <Card className="h-full gap-3">
                    <CardHeader>
                      <p className="eyebrow">{layer.code}</p>
                      <CardTitle className="section-title flex items-baseline justify-between gap-2">
                        {layer.label}
                        <span className="text-sm font-normal text-muted-foreground tabular-nums">{fmt.format(sum)}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid content-start gap-2">
                      {layer.jenis.map((k) => {
                        const n = jenisCount.get(k) ?? 0;
                        const on = filter.jenis.includes(k);
                        const c = jenisConfig[k];
                        return (
                          <button
                            key={k}
                            type="button"
                            aria-pressed={on}
                            disabled={!n && !on}
                            onClick={() => toggleJenis(k)}
                            style={{ ["--tone" as string]: `var(${c.tone})` }}
                            className={cn(
                              "group/tile grid gap-1.5 rounded-xl border px-3 py-2.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card disabled:pointer-events-none disabled:opacity-40",
                              on && "border-(--tone) bg-(--tone)/10",
                              filter.jenis.length > 0 && !on && "opacity-60",
                            )}
                          >
                            <span className="flex items-baseline justify-between gap-2 text-sm">
                              <span className="font-medium">{c.label}</span>
                              <span className="font-semibold tabular-nums">{fmt.format(n)}</span>
                            </span>
                            <span className="h-1.5 overflow-hidden rounded-full bg-muted">
                              <span className="block h-full rounded-full bg-(--tone) transition-[width] duration-700" style={{ width: `${(n / max) * 100}%` }} />
                            </span>
                          </button>
                        );
                      })}
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </section>

          <section className="grid gap-5 *:min-w-0 xl:grid-cols-[1.6fr_1fr]">
            <LinkMapCard rows={rows} selected={filter.jenis} onToggle={toggleJenis} />
            <Card data-reveal className="gap-3">
              <CardHeader>
                <CardTitle className="section-title">Status kepemilikan</CardTitle>
              </CardHeader>
              <CardContent className="grid flex-1 content-start gap-4">
                <div className="h-52">
                  <DoughnutChart
                    labels={kepemilikanOptions.map((o) => o.label)}
                    data={kepemilikanOptions.map((o) => owner.get(o.value) ?? 0)}
                    colors={kepemilikanOptions.map((o) => kepemilikanColor[o.value])}
                    caption="komponen"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2" role="group" aria-label="Filter status kepemilikan">
                  {kepemilikanOptions.map((o) => {
                    const on = filter.kepemilikan.includes(o.value);
                    const n = owner.get(o.value) ?? 0;
                    return (
                      <button
                        key={o.value}
                        type="button"
                        aria-pressed={on}
                        disabled={!n && !on}
                        onClick={() => clickFilter(o.label, (c) => ({ ...c, kepemilikan: toggle(c.kepemilikan, o.value) }), !on)}
                        className={cn(
                          "flex items-baseline justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:bg-accent disabled:opacity-40",
                          on && "border-primary bg-accent",
                          filter.kepemilikan.length > 0 && !on && "opacity-60",
                        )}
                      >
                        <span className="font-medium">{o.label}</span>
                        <span className="text-muted-foreground tabular-nums">{fmt.format(n)}</span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-5 *:min-w-0 xl:grid-cols-[1.15fr_1fr]">
            <PdRankingCard
              title="Komponen per instansi"
              unit="komponen"
              label={(code) => jenisConfig[code as InfraJenis]?.label ?? code}
              rows={pdRows}
              colorOf={(code) => jenisConfig[code as InfraJenis]?.tone ?? "--brand-teal"}
              selected={filter.pd}
              onToggle={(code) => clickFilter(pdName(code), (c) => ({ ...c, pd: toggle(c.pd, code) }), !filter.pd.includes(code))}
            />
            <div data-aos="fade-blur" suppressHydrationWarning>
              <Card className="h-full gap-3">
                <CardHeader>
                  <CardTitle className="section-title">Server & platform</CardTitle>
                </CardHeader>
                <CardContent className="grid flex-1 content-start gap-5">
                  {platforms.length > 0 && (
                    <Gauge value={pct(openSource, platforms.length)} label="Persentase perangkat lunak platform open source" caption={`${fmt.format(openSource)} dari ${fmt.format(platforms.length)} platform open source`} />
                  )}
                  {servers.length > 0 ? (
                    <div className="grid gap-3">
                      <p className="text-xs font-medium text-muted-foreground">
                        {fmt.format(servers.length)} server · memori {formatMetric(sumMetric(servers, "memory"), "memory")} · penyimpanan {formatMetric(sumMetric(servers, "storage"), "storage")}
                      </p>
                      {usage.map(([name, n], i) => (
                        <div key={name} className="grid gap-1.5">
                          <div className="flex items-baseline justify-between gap-3 text-sm">
                            <span className="font-medium">{name}</span>
                            <span className="text-muted-foreground tabular-nums">{fmt.format(n)}</span>
                          </div>
                          <Meter value={pct(n, servers.length)} label={`Server ${name}`} indicatorClassName={toneBgClass[categoryColor(i)]} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState illustration="data-center" title="Tidak ada server" description="Filter saat ini tidak memuat perangkat keras server." />
                  )}
                </CardContent>
              </Card>
            </div>
          </section>

          <DataTable
            title="Katalog infrastruktur"
            rows={rows}
            rowId={(r) => r.id}
            searchText={(r) => `${r.id} ${r.name} ${r.deskripsi ?? ""} ${jenisConfig[r.jenis].label} ${Object.values(r.atribut).join(" ")}`}
            searchPlaceholder="Cari nama, ID, atau spesifikasi"
            onRowClick={setSelected}
            pageSize={20}
            minWidth={900}
            columns={[
              { header: "ID", className: "whitespace-nowrap", sortValue: (r) => r.id, cell: (r) => <span className="font-medium text-muted-foreground tabular-nums">{r.id}</span> },
              { header: "Nama komponen", sortValue: (r) => r.name, cell: (r) => <span className="font-semibold">{r.name}</span> },
              { header: "Komponen", sortValue: (r) => r.jenis, cell: (r) => <ToneBadge tone={jenisConfig[r.jenis].tone}>{jenisConfig[r.jenis].short}</ToneBadge> },
              { header: "Instansi", hideable: true, sortValue: (r) => pdName(r.opd), cell: (r) => pdName(r.opd) },
              { header: "Kepemilikan", hideable: true, sortValue: (r) => r.kepemilikan ?? "", cell: (r) => (r.kepemilikan ? <StatusBadge status={kepemilikanLabel[r.kepemilikan]} /> : "—") },
              { header: "Lokasi", hideable: true, defaultHidden: true, sortValue: (r) => r.atribut.lokasi ?? "", cell: (r) => r.atribut.lokasi ?? "—" },
              { header: "Relasi", hideable: true, defaultHidden: true, sortValue: (r) => r.relasi.length + r.terhubung.length, cell: (r) => `${r.relasi.length + r.terhubung.length} komponen` },
              { header: "Aplikasi", hideable: true, defaultHidden: true, sortValue: (r) => r.aplikasi.length, cell: (r) => (r.aplikasi.length ? `${r.aplikasi.length} aplikasi` : "—") },
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
              <ToneBadge tone={jenisConfig[selected.jenis].tone}>{jenisConfig[selected.jenis].label}</ToneBadge>
              {selected.kepemilikan && <StatusBadge status={kepemilikanLabel[selected.kepemilikan]} />}
            </>
          }
        >
          {selected.deskripsi && (
            <DetailSection title="Deskripsi" tone="accent">
              <p className="text-sm leading-relaxed">{selected.deskripsi}</p>
            </DetailSection>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            <DetailField label={`RAI Level 1 · ${selected.rai1}`} value={rai.byCode.get(selected.rai1)?.name} />
            <DetailField label={`RAI Level 2 · ${selected.rai2}`} value={rai.byCode.get(selected.rai2)?.name} />
            <DetailField label="Instansi" value={pdName(selected.opd)} />
            {selected.pemilik && <DetailField label="Nama pemilik" value={selected.pemilik} />}
            {selected.pengelola && <DetailField label="Unit pengelola" value={selected.pengelola} />}
          </div>
          {attrEntries(selected).length > 0 && (
            <DetailSection title="Spesifikasi">
              <div className="grid gap-2 sm:grid-cols-2">
                {attrEntries(selected).map((a) => (
                  <DetailField key={a.label} label={a.label} value={a.value} />
                ))}
              </div>
            </DetailSection>
          )}
          <RelasiSection r={selected} />
        </DetailDialog>
      )}
    </Reveal>
  );
}
