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
import { Gauge } from "@/components/blocks/gauge";
import { StatCard } from "@/components/blocks/stat-card";
import { StatRow } from "@/components/blocks/stat-row";
import { StatusBadge } from "@/components/blocks/status-badge";
import { Treemap } from "@/components/blocks/treemap";
import { BarChart } from "@/components/charts";
import { OwnershipFlowCard } from "@/components/dashboards/aplikasi/ownership-flow";
import { ExploreHint } from "@/components/dashboards/probis/explore-hint";
import { PdRankingCard, type PdRow } from "@/components/dashboards/probis/pd-ranking";
import { Icon } from "@/components/icon";
import { Meter } from "@/components/motion/meter";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { allAplikasi } from "@/lib/aplikasi/generate";
import { activeFilterCount, countBy, emptyFilter, filterAplikasi, filterFromParams, filterToParams, raaOptions, sanitizeFilter, type AplikasiFilter } from "@/lib/aplikasi/query";
import {
  basisLabel, basisOptions, infraFields, kepemilikanColor, kepemilikanLabel, kepemilikanOptions, lisensiLabel, lisensiOptions, sampleRaa,
  type Basis, type Kepemilikan, type Lisensi,
} from "@/lib/aplikasi/reference";
import { colorByCount } from "@/lib/palette";
import { pdByCode, perangkatDaerah, type PeriodOptions } from "@/lib/probis/reference";
import type { Aplikasi } from "@/lib/types";
import { cn } from "@/lib/utils";

const fmt = new Intl.NumberFormat("id-ID");
const pct = (part: number, whole: number) => Math.round((part / (whole || 1)) * 100);
const pdName = (code: string) => pdByCode.get(code)?.name ?? code;
const pdOptions = perangkatDaerah.map((pd) => ({ value: pd.code, label: pd.name }));
const toOptions = (nodes: { code: string; name: string }[]) => nodes.map((n) => ({ value: n.code, label: `${n.code} ${n.name}` }));
const toggle = (list: string[], value: string) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
const raa = sampleRaa;
const raaLabel = raa.label;
/** "01.02 Administrasi Pemerintahan" — nama RAA L2 tanpa awalan L1 agar muat di grafik. */
const raaShort = (code: string) => `${code.slice(4)} ${(raa.byCode.get(code)?.name ?? "").replace(/^Aplikasi (Umum|Khusus)\s+/, "")}`;
const raa2Codes = raa.level(2).map((n) => n.code);
const pengembangName = (a: Aplikasi) => (pdByCode.has(a.pengembang) ? pdName(a.pengembang) : a.pengembang);

/** Dashboard publik Domain Aplikasi. Semua widget mengikuti filter aktif. */
export function AplikasiDashboard({
  data,
  sample,
  periods: { periods, active: activePeriod },
}: {
  /** Aplikasi disetujui dari database; null = data contoh bawaan. */
  data: Aplikasi[] | null;
  sample: boolean;
  periods: PeriodOptions;
}) {
  const params = useSearchParams();
  const all = useMemo(() => data ?? allAplikasi(), [data]);
  const [filter, setFilterState] = useState<AplikasiFilter>(() =>
    sanitizeFilter(filterFromParams(new URLSearchParams(params.toString()), activePeriod), {
      periods,
      defaultPeriod: activePeriod,
      pd: new Set([...pdByCode.keys(), ...all.map((a) => a.operasional)]),
      basis: new Set(Object.keys(basisLabel)),
      lisensi: new Set(Object.keys(lisensiLabel)),
      kepemilikan: new Set(Object.keys(kepemilikanLabel)),
      raa,
    }),
  );
  const [selected, setSelected] = useState<Aplikasi | null>(null);
  /** Filter terbaru, untuk aksi tertunda (animasi chip, Urungkan di toast). */
  const latest = useRef(filter);

  /** Simpan filter di URL agar tampilan bisa dibagikan, tanpa memicu navigasi. */
  const setFilter = (next: AplikasiFilter | ((current: AplikasiFilter) => AplikasiFilter)) => {
    const value = typeof next === "function" ? next(latest.current) : next;
    latest.current = value;
    setFilterState(value);
    const query = filterToParams(value, activePeriod).toString();
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  };
  /** RAA L2 yang tidak berada di bawah RAA L1 terpilih dibuang. */
  const setRaa1 = (raa1: string[]) => setFilter((c) => ({ ...c, raa1, raa2: c.raa2.filter((code) => !raa1.length || raa1.includes(raa.byCode.get(code)!.parent!)) }));

  /** Klik pita/batang/baris: filter langsung diterapkan, toast menawarkan Urungkan. */
  const clickFilter = (label: string, apply: (current: AplikasiFilter) => AplikasiFilter, adding: boolean) => {
    const before = latest.current;
    setFilter(apply);
    if (adding) toast("Filter diterapkan", { description: label, action: { label: "Urungkan", onClick: () => setFilter(before) } });
  };

  const rows = useMemo(() => filterAplikasi(all, filter), [all, filter]);
  /** Widget yang juga berfungsi sebagai filter memakai data tanpa filternya sendiri, agar pilihan lain tetap terlihat. */
  const withoutOwnerRaa = useMemo(() => filterAplikasi(all, { ...filter, kepemilikan: [], raa2: [] }), [all, filter]);
  const withoutPd = useMemo(() => filterAplikasi(all, { ...filter, pd: [] }), [all, filter]);
  const withoutBasis = useMemo(() => filterAplikasi(all, { ...filter, basis: [] }), [all, filter]);

  const options = raaOptions(filter, raa);
  /** Satu warna per RAA L2, dipakai sama di batang ranking unit operasional. */
  const raaColor = useMemo(() => colorByCount(all, (a) => a.raa2), [all]);
  const owner = countBy(rows, "kepemilikan");
  const total = rows.length;
  const umum = rows.filter((a) => a.raa1 === "RAA.01").length;
  const pusat = rows.filter((a) => a.kepemilikan === "pusat");
  const pdCount = countBy(rows, "operasional").size;
  const splp = rows.filter((a) => a.splp).length;
  const basis = countBy(withoutBasis, "basis");
  const bahasa = [...countBy(rows, "bahasa")].filter(([code]) => code !== "Tidak diketahui").map(([code, value]) => ({ code, label: code, value }));
  const mesin = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of rows) if (a.mesin) counts.set(a.mesin, (counts.get(a.mesin) ?? 0) + 1);
    return [...counts].sort((x, y) => y[1] - x[1]);
  }, [rows]);
  const pdRows = useMemo<PdRow[]>(() => {
    const groups = new Map<string, Aplikasi[]>();
    for (const a of withoutPd) groups.set(a.operasional, [...(groups.get(a.operasional) ?? []), a]);
    return [...groups]
      .map(([code, list]) => ({ code, name: pdName(code), count: list.length, sektor: [...countBy(list, "raa2")].sort((a, b) => b[1] - a[1]) }))
      .sort((a, b) => b.count - a.count);
  }, [withoutPd]);
  const raaBars = raa2Codes.filter((code) => withoutOwnerRaa.some((a) => a.raa2 === code));

  const active = activeFilterCount(filter, activePeriod);
  const removeFrom = (key: "pd" | "basis" | "lisensi" | "kepemilikan" | "raa2", code: string) => () => setFilter((c) => ({ ...c, [key]: c[key].filter((v) => v !== code) }));
  const chips: Chip[] = [
    ...filter.pd.map((code) => ({ id: `pd:${code}`, group: "Unit", label: pdName(code), onRemove: removeFrom("pd", code) })),
    ...filter.kepemilikan.map((code) => ({ id: `kep:${code}`, group: "Kepemilikan", label: kepemilikanLabel[code as Kepemilikan], onRemove: removeFrom("kepemilikan", code) })),
    ...filter.basis.map((code) => ({ id: `basis:${code}`, group: "Basis", label: basisLabel[code as Basis], onRemove: removeFrom("basis", code) })),
    ...filter.lisensi.map((code) => ({ id: `lisensi:${code}`, group: "Lisensi", label: lisensiLabel[code as Lisensi], onRemove: removeFrom("lisensi", code) })),
    ...(filter.period !== activePeriod ? [{ id: "period", group: "Periode", label: filter.period, onRemove: () => setFilter((c) => ({ ...c, period: activePeriod })) }] : []),
    ...filter.raa1.map((code) => ({ id: `raa1:${code}`, group: "RAA 1", label: raaLabel(code), onRemove: () => setRaa1(latest.current.raa1.filter((v) => v !== code)) })),
    ...filter.raa2.map((code) => ({ id: `raa2:${code}`, group: "RAA 2", label: raaLabel(code), onRemove: removeFrom("raa2", code) })),
  ];

  return (
    <Reveal className="grid gap-5">
      <ExploreHint
        sample={sample}
        storageKey="spbe:aplikasi-hint"
        illustration="app-ecosystem"
        tips={[
          "Klik pita alur, batang RAA, basis aplikasi, atau nama unit operasional untuk memfilter seluruh dashboard.",
          "Setiap aplikasi selaras dengan proses bisnis; klik baris katalog untuk melihat probis, IKU, dan dependensinya.",
          "Aplikasi yang terhubung SPLP dapat berbagi pakai data dengan aplikasi lain.",
        ]}
      />
      <FilterBar
        filters={[
          { label: "Unit Operasional", wide: true, multiple: true, searchable: true, options: pdOptions, values: filter.pd, onValuesChange: (pd) => setFilter((c) => ({ ...c, pd })) },
          { label: "Kepemilikan", multiple: true, options: kepemilikanOptions, values: filter.kepemilikan, onValuesChange: (kepemilikan) => setFilter((c) => ({ ...c, kepemilikan })) },
          { label: "Basis", multiple: true, options: basisOptions, values: filter.basis, onValuesChange: (basis) => setFilter((c) => ({ ...c, basis })) },
          { label: "Lisensi", multiple: true, options: lisensiOptions, values: filter.lisensi, onValuesChange: (lisensi) => setFilter((c) => ({ ...c, lisensi })) },
          { label: "Periode", required: true, options: [...periods], value: filter.period, onChange: (period) => setFilter((c) => ({ ...c, period })) },
          { label: "RAA 1", multiple: true, options: toOptions(options.level1), values: filter.raa1, onValuesChange: setRaa1 },
          { label: "RAA 2", multiple: true, options: toOptions(options.level2), values: filter.raa2, onValuesChange: (raa2) => setFilter((c) => ({ ...c, raa2 })) },
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
          <EmptyState illustration="filter-empty" title="Tidak ada aplikasi" description="Tidak ada aplikasi yang cocok dengan kombinasi filter ini. Hapus salah satu chip filter atau reset semuanya.">
            <Button variant="outline" onClick={() => setFilter(emptyFilter(activePeriod))}>Reset filter</Button>
          </EmptyState>
        </Card>
      ) : (
        <>
          <StatRow>
            <StatCard tone="teal" label="Jumlah aplikasi" value={total} hint={`${fmt.format(umum)} umum · ${fmt.format(total - umum)} khusus`} />
            <StatCard tone="orange" label="Aplikasi Pemda" value={owner.get("pemda") ?? 0} hint={`${pct(owner.get("pemda") ?? 0, total)}% dibangun Perangkat Daerah`} />
            <StatCard tone="yellow" label="Aplikasi Instansi Pusat" value={pusat.length} hint={`dioperasikan ${new Set(pusat.map((a) => a.operasional)).size} Perangkat Daerah`} />
            <StatCard tone="amber" label="Unit operasional" value={pdCount} hint={`dari ${perangkatDaerah.length} Perangkat Daerah`} />
          </StatRow>

          <section className="grid gap-5 *:min-w-0 xl:grid-cols-[1.6fr_1fr]">
            <OwnershipFlowCard
              rows={withoutOwnerRaa}
              raa2={raa2Codes}
              label={raaShort}
              kepemilikan={filter.kepemilikan}
              selectedRaa2={filter.raa2}
              onSelect={(k, r) => {
                const on = (!k || filter.kepemilikan.includes(k)) && (!r || filter.raa2.includes(r));
                const text = [k && kepemilikanLabel[k], r && raaShort(r)].filter(Boolean).join(" → ");
                clickFilter(text, (c) => (on ? { ...c, kepemilikan: k ? c.kepemilikan.filter((v) => v !== k) : c.kepemilikan, raa2: r ? c.raa2.filter((v) => v !== r) : c.raa2 } : { ...c, kepemilikan: k ? [k] : c.kepemilikan, raa2: r ? [r] : c.raa2 }), !on);
              }}
            />
            <Card data-reveal className="gap-3">
              <CardHeader>
                <CardTitle className="section-title">Interoperabilitas aplikasi</CardTitle>
              </CardHeader>
              <CardContent className="grid flex-1 content-center gap-5">
                <Gauge value={pct(splp, total)} label="Persentase aplikasi terhubung SPLP" caption={`${fmt.format(splp)} dari ${fmt.format(total)} terhubung SPLP`} />
                <div className="grid grid-cols-2 gap-2" role="group" aria-label="Filter basis aplikasi">
                  {basisOptions.map((o) => {
                    const on = filter.basis.includes(o.value);
                    const n = basis.get(o.value) ?? 0;
                    return (
                      <button
                        key={o.value}
                        type="button"
                        aria-pressed={on}
                        disabled={!n && !on}
                        onClick={() => clickFilter(`Basis ${o.label}`, (c) => ({ ...c, basis: toggle(c.basis, o.value) }), !on)}
                        className={cn(
                          "flex items-baseline justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:bg-accent disabled:opacity-40",
                          on && "border-primary bg-accent",
                          filter.basis.length > 0 && !on && "opacity-60",
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

          <section className="grid gap-5 *:min-w-0 xl:grid-cols-[1fr_1.15fr]">
            <Card data-reveal className="gap-3">
              <CardHeader>
                <CardTitle className="section-title">RAA Level 2 × kepemilikan</CardTitle>
              </CardHeader>
              <CardContent className="min-h-80 flex-1">
                <BarChart
                  horizontal
                  stacked
                  labels={raaBars.map(raaShort)}
                  series={kepemilikanOptions.map((k) => ({ label: k.label, color: kepemilikanColor[k.value], data: raaBars.map((code) => withoutOwnerRaa.filter((a) => a.raa2 === code && a.kepemilikan === k.value).length) }))}
                  selected={raaBars.flatMap((code, label) => kepemilikanOptions.flatMap((k, series) => (filter.raa2.includes(code) && filter.kepemilikan.includes(k.value) ? [{ label, series }] : [])))}
                  onSelect={(label, series) => {
                    const code = raaBars[label]!;
                    const k = kepemilikanOptions[series]!.value;
                    const on = filter.raa2.includes(code) && filter.kepemilikan.includes(k);
                    clickFilter(`${kepemilikanLabel[k]} · ${raaShort(code)}`, (c) => (on ? { ...c, raa2: c.raa2.filter((v) => v !== code), kepemilikan: c.kepemilikan.filter((v) => v !== k) } : { ...c, raa2: [code], kepemilikan: [k] }), !on);
                  }}
                />
              </CardContent>
            </Card>
            <PdRankingCard
              title="Aplikasi per unit operasional"
              unit="aplikasi"
              label={raaLabel}
              rows={pdRows}
              colorOf={raaColor}
              selected={filter.pd}
              onToggle={(code) => clickFilter(pdName(code), (c) => ({ ...c, pd: toggle(c.pd, code) }), !filter.pd.includes(code))}
            />
          </section>

          <section className="grid gap-5 *:min-w-0 xl:grid-cols-[1fr_1.15fr]">
            {/* AOS menambah class "aos-init" sebelum hidrasi; dibatasi di pembungkus agar class Card tetap utuh. */}
            <div data-aos="fade-blur" suppressHydrationWarning>
              <Card className="h-full gap-3">
                <CardHeader>
                  <CardTitle className="section-title">Kesiapan infrastruktur</CardTitle>
                </CardHeader>
                <CardContent className="grid flex-1 content-start gap-4">
                  {[
                    ...infraFields.map((f) => ({ key: f.key, label: f.label, value: rows.filter((a) => a[f.key]).length })),
                    { key: "open", label: "Lisensi open source", value: rows.filter((a) => a.lisensi === "open_source").length },
                  ].map((item) => (
                    <div key={item.key} className="grid gap-1.5">
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="font-medium">{item.label}</span>
                        <span className="text-muted-foreground tabular-nums">
                          {fmt.format(item.value)} <span className="text-xs">({pct(item.value, total)}%)</span>
                        </span>
                      </div>
                      <Meter value={pct(item.value, total)} label={item.label} indicatorClassName={item.key === "open" ? "bg-brand-teal" : undefined} />
                    </div>
                  ))}
                  {mesin.length > 0 && (
                    <div className="grid gap-2 border-t pt-4">
                      <p className="text-xs font-medium text-muted-foreground">Mesin basis data</p>
                      <ul className="flex flex-wrap gap-1.5">
                        {mesin.map(([name, n]) => (
                          <li key={name}>
                            <Badge variant="muted" className="tabular-nums">
                              {name} · {fmt.format(n)}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            <div data-aos="fade-blur" data-aos-delay="80" suppressHydrationWarning>
              <Card className="h-full gap-3">
                <CardHeader>
                  <CardTitle className="section-title">Bahasa pemrograman</CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  {bahasa.length ? (
                    <Treemap items={bahasa} className="h-[20rem] sm:h-[22rem]" />
                  ) : (
                    <EmptyState illustration="empty" title="Belum ada data teknologi" description="Aplikasi Instansi Pusat tidak mencantumkan bahasa pemrograman." />
                  )}
                </CardContent>
              </Card>
            </div>
          </section>

          <DataTable
            title="Katalog aplikasi"
            rows={rows}
            rowId={(a) => a.id}
            searchText={(a) => `${a.id} ${a.name} ${a.uraian} ${a.layanan.map((l) => l.name).join(" ")}`}
            searchPlaceholder="Cari nama, ID, atau layanan"
            onRowClick={setSelected}
            pageSize={20}
            minWidth={960}
            columns={[
              { header: "ID Aplikasi", className: "whitespace-nowrap", sortValue: (a) => a.id, cell: (a) => <span className="font-medium text-muted-foreground tabular-nums">{a.id}</span> },
              { header: "Nama aplikasi", sortValue: (a) => a.name, cell: (a) => <span className="font-semibold">{a.name}</span> },
              {
                header: "Layanan",
                sortValue: (a) => a.layanan[0]?.name ?? "",
                cell: (a) =>
                  a.layanan.length ? (
                    <span className="line-clamp-2">
                      {a.layanan[0]!.name}
                      {a.layanan.length > 1 && <span className="text-muted-foreground"> +{a.layanan.length - 1}</span>}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  ),
              },
              { header: "Kepemilikan", hideable: true, sortValue: (a) => a.kepemilikan, cell: (a) => <StatusBadge status={kepemilikanLabel[a.kepemilikan]} /> },
              { header: "Unit operasional", hideable: true, sortValue: (a) => pdName(a.operasional), cell: (a) => pdName(a.operasional) },
              { header: "Basis", hideable: true, defaultHidden: true, sortValue: (a) => a.basis, cell: (a) => basisLabel[a.basis] },
              { header: "RAA 2", hideable: true, defaultHidden: true, sortValue: (a) => a.raa2, cell: (a) => <span className="text-muted-foreground">{raaShort(a.raa2)}</span> },
              { header: "Lisensi", hideable: true, defaultHidden: true, sortValue: (a) => a.lisensi, cell: (a) => lisensiLabel[a.lisensi] },
              { header: "Bahasa", hideable: true, defaultHidden: true, sortValue: (a) => a.bahasa, cell: (a) => a.bahasa },
              { header: "Mesin basis data", hideable: true, defaultHidden: true, sortValue: (a) => a.mesin ?? "", cell: (a) => a.mesin ?? "—" },
              { header: "Pengembang", hideable: true, defaultHidden: true, sortValue: (a) => pengembangName(a), cell: (a) => pengembangName(a) },
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
              <StatusBadge status={kepemilikanLabel[selected.kepemilikan]} />
              <Badge variant="info">{basisLabel[selected.basis]}</Badge>
              {selected.splp && <StatusBadge status="Terintegrasi" />}
            </>
          }
        >
          <DetailSection title="Uraian & fungsi" tone="accent">
            <p className="text-sm leading-relaxed">{selected.uraian}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{selected.fungsi}</p>
          </DetailSection>
          <div className="grid gap-2 sm:grid-cols-2">
            <DetailField label={`RAA Level 1 · ${selected.raa1}`} value={raa.byCode.get(selected.raa1)?.name} />
            <DetailField label={`RAA Level 2 · ${selected.raa2}`} value={raa.byCode.get(selected.raa2)?.name} />
            <DetailField label="Unit operasional teknologi" value={pdName(selected.operasional)} />
            <DetailField label="Unit pengembang" value={pengembangName(selected)} />
            <DetailField label="Luaran" value={selected.luaran} />
            <DetailField label="Pengguna (customer data)" value={selected.customer ?? "—"} />
          </div>
          <DetailSection title="Teknologi & infrastruktur">
            <div className="grid gap-2 sm:grid-cols-3">
              <DetailField label="Bahasa pemrograman" value={selected.bahasa} />
              <DetailField label="Kerangka pengembangan" value={selected.kerangka ?? "—"} />
              <DetailField label="Mesin basis data" value={selected.mesin ?? "—"} />
              <DetailField label="Tipe lisensi" value={lisensiLabel[selected.lisensi]} />
              {infraFields.map((f) => (
                <DetailField key={f.key} label={f.label} value={selected[f.key] ?? "—"} />
              ))}
            </div>
          </DetailSection>
          <DetailSection title="Proses bisnis & kinerja">
            <ul className="grid gap-3 text-sm">
              {selected.probis.map((p) => (
                <li key={p.id} className="grid gap-0.5">
                  <span className="text-xs text-muted-foreground tabular-nums">{p.id}</span>
                  <span className="font-medium">{p.name}</span>
                  {p.iku && (
                    <span className="text-muted-foreground">
                      IKU: {p.iku}
                      {p.sasaran && <span className="block text-xs">Sasaran: {p.sasaran}</span>}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </DetailSection>
          <DetailSection title="Dependensi">
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { title: "Layanan yang didukung", items: selected.layanan, empty: "Belum ditautkan ke layanan." },
                { title: "Data yang digunakan", items: selected.data, empty: "Belum ditautkan ke data." },
              ].map((group) => (
                <div key={group.title} className="grid content-start gap-1.5">
                  <p className="text-xs font-medium text-muted-foreground">{group.title}</p>
                  {group.items.length ? (
                    <ul className="grid gap-1.5 text-sm">
                      {group.items.map((item) => (
                        <li key={item.id} className="grid">
                          <span className="text-xs text-muted-foreground tabular-nums">{item.id}</span>
                          {item.name}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">{group.empty}</p>
                  )}
                </div>
              ))}
            </div>
            {selected.supplier && <DetailField className="mt-3" label="Supplier data" value={selected.supplier} />}
          </DetailSection>
        </DetailDialog>
      )}
    </Reveal>
  );
}
