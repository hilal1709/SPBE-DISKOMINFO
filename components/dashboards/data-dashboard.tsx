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
import { StatusBadge } from "@/components/blocks/status-badge";
import { Treemap } from "@/components/blocks/treemap";
import { BarChart } from "@/components/charts";
import { SifatJenisCard } from "@/components/dashboards/data/sifat-jenis";
import { ExploreHint } from "@/components/dashboards/probis/explore-hint";
import { PdRankingCard, type PdRow } from "@/components/dashboards/probis/pd-ranking";
import { RabTreeCard } from "@/components/dashboards/probis/rab-tree";
import { Icon } from "@/components/icon";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { allData } from "@/lib/data/generate";
import { categorical, colorByCount } from "@/lib/palette";
import { activeFilterCount, countBy, emptyFilter, filterData, filterFromParams, filterToParams, radOptions, radTree, sanitizeFilter, type DataFilter } from "@/lib/data/query";
import { jenisLabel, jenisOptions, sifatLabel, sifatOptions, validitasOptions, type Jenis, type Sifat } from "@/lib/data/reference";
import { useRadSet } from "@/components/data/rad-context";
import type { RabIndex } from "@/lib/probis/rab-index";
import { pdByCode, perangkatDaerah, type PeriodOptions } from "@/lib/probis/reference";
import type { DataInfo } from "@/lib/types";

const fmt = new Intl.NumberFormat("id-ID");
const pct = (part: number, whole: number) => `${Math.round((part / (whole || 1)) * 100)}%`;
const pdName = (code: string) => pdByCode.get(code)?.name ?? code;
const pdOptions = perangkatDaerah.map((pd) => ({ value: pd.code, label: pd.name }));
const toOptions = (nodes: { code: string; name: string }[]) => nodes.map((n) => ({ value: n.code, label: `${n.code} ${n.name}` }));
const toggle = (list: string[], value: string) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
const radLevels = ["", "Data pokok", "Data tematik", "Topik"];
const interopLabel = (d: DataInfo) => (d.interoperabel ? "Interoperabel" : "Belum");

type RadKey = "rad1" | "rad2" | "rad3";

/** RAD bertingkat: buang pilihan turunan yang tidak lagi berada di bawah induk terpilih. */
function withRad(current: DataFilter, patch: Partial<Pick<DataFilter, RadKey>>, rad: RabIndex) {
  const next = { ...current, ...patch };
  for (const [key, level] of [["rad2", "level2"], ["rad3", "level3"]] as const) {
    const allowed = new Set(radOptions(next, rad)[level].map((n) => n.code));
    next[key] = next[key].filter((c) => allowed.has(c));
  }
  return next;
}

/** Dashboard publik Domain Data. Semua widget mengikuti filter aktif. */
export function DataDashboard({
  data,
  sample,
  periods: { periods, active: activePeriod },
}: {
  /** Data disetujui dari database; null = data contoh bawaan. */
  data: DataInfo[] | null;
  sample: boolean;
  periods: PeriodOptions;
}) {
  const params = useSearchParams();
  const rads = useRadSet();
  const all = useMemo(() => data ?? allData(), [data]);
  const [filter, setFilterState] = useState<DataFilter>(() => {
    const parsed = filterFromParams(new URLSearchParams(params.toString()), activePeriod);
    const rad = rads.forPeriod(periods.includes(parsed.period) ? parsed.period : activePeriod);
    const valid = {
      periods,
      defaultPeriod: activePeriod,
      pd: new Set([...pdByCode.keys(), ...all.map((d) => d.wali)]),
      sifat: new Set(Object.keys(sifatLabel)),
      jenis: new Set(Object.keys(jenisLabel)),
      validitas: new Set(validitasOptions),
      rad,
    };
    // RAD turunan yang tidak berada di bawah induk terpilih juga dibuang.
    return withRad(sanitizeFilter(parsed, valid), {}, rad);
  });
  const [selected, setSelected] = useState<DataInfo | null>(null);
  /** Filter terbaru, untuk aksi tertunda (animasi chip, Urungkan di toast). */
  const latest = useRef(filter);

  /** Simpan filter di URL agar tampilan bisa dibagikan, tanpa memicu navigasi. */
  const setFilter = (next: DataFilter | ((current: DataFilter) => DataFilter)) => {
    const value = typeof next === "function" ? next(latest.current) : next;
    latest.current = value;
    setFilterState(value);
    const query = filterToParams(value, activePeriod).toString();
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  };
  const setRad = (patch: Partial<Pick<DataFilter, RadKey>>) => setFilter((current) => withRad(current, patch, rads.forPeriod(current.period)));
  /** Referensi RAD mengikuti versi milik periode yang dipilih. */
  const rad = useMemo(() => rads.forPeriod(filter.period), [rads, filter.period]);
  const radLabel = rad.label;

  /** Klik batang/petak/baris: filter langsung diterapkan, toast menawarkan Urungkan. */
  const clickFilter = (label: string, apply: (current: DataFilter) => DataFilter, adding: boolean) => {
    const before = latest.current;
    setFilter(apply);
    if (adding) toast("Filter diterapkan", { description: label, action: { label: "Urungkan", onClick: () => setFilter(before) } });
  };

  const rows = useMemo(() => filterData(all, filter), [all, filter]);
  /** Widget yang juga berfungsi sebagai filter memakai data tanpa filternya sendiri, agar pilihan lain tetap terlihat. */
  const withoutRad2 = useMemo(() => filterData(all, { ...filter, rad2: [] }), [all, filter]);
  const withoutPd = useMemo(() => filterData(all, { ...filter, pd: [] }), [all, filter]);
  const withoutSifatJenis = useMemo(() => filterData(all, { ...filter, sifat: [], jenis: [] }), [all, filter]);
  const withoutValiditas = useMemo(() => filterData(all, { ...filter, validitas: [] }), [all, filter]);

  const options = radOptions(filter, rad);
  const tree = useMemo(() => radTree(rows, rad), [rows, rad]);
  /** Satu warna per data tematik (RAD 2), dipakai sama di rekap, treemap, dan ranking wali data. */
  const tematikColor = useMemo(() => colorByCount(all, (d) => d.rad2), [all]);
  const sifat = countBy(rows, "sifat");
  const interop = rows.filter((d) => d.interoperabel).length;
  const realtime = rows.filter((d) => d.validitas === "Realtime").length;
  const lintas = rows.filter((d) => d.produsen !== d.wali).length;
  const waliCount = countBy(rows, "wali").size;
  const tematik = [...countBy(withoutRad2, "rad2")].map(([code, value]) => ({ code, value, label: rad.byCode.get(code)?.name ?? code }));
  const validitas = useMemo(() => {
    const counts = countBy(withoutValiditas, "validitas");
    return validitasOptions.filter((v) => counts.has(v)).map((v) => ({ value: v, count: counts.get(v)! }));
  }, [withoutValiditas]);
  const pdRows = useMemo<PdRow[]>(() => {
    const groups = new Map<string, DataInfo[]>();
    for (const d of withoutPd) groups.set(d.wali, [...(groups.get(d.wali) ?? []), d]);
    return [...groups]
      .map(([code, list]) => ({ code, name: pdName(code), count: list.length, sektor: [...countBy(list, "rad2")].sort((a, b) => b[1] - a[1]) }))
      .sort((a, b) => b.count - a.count);
  }, [withoutPd]);

  const active = activeFilterCount(filter, activePeriod);
  const removeFrom = (key: "pd" | "sifat" | "jenis" | "validitas", code: string) => () => setFilter((c) => ({ ...c, [key]: c[key].filter((v) => v !== code) }));
  const chips: Chip[] = [
    ...filter.pd.map((code) => ({ id: `pd:${code}`, group: "Wali", label: pdName(code), onRemove: removeFrom("pd", code) })),
    ...filter.sifat.map((code) => ({ id: `sifat:${code}`, group: "Sifat", label: sifatLabel[code as Sifat], onRemove: removeFrom("sifat", code) })),
    ...filter.jenis.map((code) => ({ id: `jenis:${code}`, group: "Jenis", label: jenisLabel[code as Jenis], onRemove: removeFrom("jenis", code) })),
    ...filter.validitas.map((code) => ({ id: `validitas:${code}`, group: "Validitas", label: code, onRemove: removeFrom("validitas", code) })),
    ...(filter.period !== activePeriod ? [{ id: "period", group: "Periode", label: filter.period, onRemove: () => setFilter((c) => ({ ...c, period: activePeriod })) }] : []),
    ...(["rad1", "rad2", "rad3"] as const).flatMap((key, i) =>
      filter[key].map((code) => ({ id: `${key}:${code}`, group: `RAD ${i + 1}`, label: radLabel(code), onRemove: () => setRad({ [key]: latest.current[key].filter((v) => v !== code) }) })),
    ),
  ];
  const total = rows.length || 1;

  return (
    <Reveal className="grid gap-5">
      <ExploreHint
        sample={sample}
        storageKey="spbe:data-hint"
        illustration="data-catalog"
        tips={[
          "Klik batang jenis × sifat, frekuensi pemutakhiran, atau nama Perangkat Daerah untuk memfilter seluruh dashboard.",
          "Data interoperabel sudah dapat dibagipakaikan antar sistem melalui Sistem Penghubung Layanan.",
          "Klik baris katalog untuk melihat uraian, wali data, serta proses bisnis dan layanan terkait.",
        ]}
      />
      <FilterBar
        filters={[
          { label: "Wali Data", wide: true, multiple: true, searchable: true, options: pdOptions, values: filter.pd, onValuesChange: (pd) => setFilter((c) => ({ ...c, pd })) },
          { label: "Sifat", multiple: true, options: sifatOptions, values: filter.sifat, onValuesChange: (sifat) => setFilter((c) => ({ ...c, sifat })) },
          { label: "Jenis", multiple: true, options: jenisOptions, values: filter.jenis, onValuesChange: (jenis) => setFilter((c) => ({ ...c, jenis })) },
          { label: "Validitas", multiple: true, options: validitasOptions.map((v) => ({ value: v, label: v })), values: filter.validitas, onValuesChange: (validitas) => setFilter((c) => ({ ...c, validitas })) },
          { label: "Periode", required: true, options: [...periods], value: filter.period, onChange: (period) => setFilter((c) => ({ ...c, period })) },
          { label: "RAD 1", multiple: true, options: toOptions(options.level1), values: filter.rad1, onValuesChange: (rad1) => setRad({ rad1 }) },
          { label: "RAD 2", multiple: true, searchable: true, options: toOptions(options.level2), values: filter.rad2, onValuesChange: (rad2) => setRad({ rad2 }) },
          { label: "RAD 3", multiple: true, searchable: true, options: toOptions(options.level3), values: filter.rad3, onValuesChange: (rad3) => setRad({ rad3 }) },
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
          <EmptyState illustration="filter-empty" title="Tidak ada data" description="Tidak ada data yang cocok dengan kombinasi filter ini. Hapus salah satu chip filter atau reset semuanya.">
            <Button variant="outline" onClick={() => setFilter(emptyFilter(activePeriod))}>Reset filter</Button>
          </EmptyState>
        </Card>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard tone="teal" label="Jumlah data" value={rows.length} hint={`${tree.length} data pokok RAD`} />
            <StatCard tone="orange" label="Perangkat Daerah wali data" value={waliCount} hint={`dari ${perangkatDaerah.length} Perangkat Daerah`} />
            <StatCard tone="yellow" label="Data terbuka" value={sifat.get("terbuka") ?? 0} hint={`${pct(sifat.get("terbuka") ?? 0, rows.length)} dari seluruh data`} />
            <StatCard tone="amber" label="Produsen lintas PD" value={lintas} hint="produsen berbeda dari wali" />
          </section>

          <section className="grid gap-5 *:min-w-0 lg:grid-cols-2">
            <Card data-reveal className="gap-3">
              <CardHeader>
                <CardTitle className="section-title">Interoperabilitas data</CardTitle>
              </CardHeader>
              <CardContent className="grid flex-1 content-center gap-5">
                <Gauge value={(interop / total) * 100} label="Persentase data interoperabel" caption={`${fmt.format(interop)} dari ${fmt.format(rows.length)} data`} />
                <dl className="grid gap-2 text-center">
                  <div className="rounded-lg bg-brand-sky px-2 py-2 text-on-brand">
                    <dt className="text-xs font-medium">Diperbarui realtime</dt>
                    <dd className="font-semibold tabular-nums">
                      {fmt.format(realtime)} <span className="text-xs font-normal opacity-80">({pct(realtime, rows.length)})</span>
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <SifatJenisCard
              rows={withoutSifatJenis}
              sifat={filter.sifat}
              jenis={filter.jenis}
              onSelect={(j, s) => {
                const on = filter.jenis.includes(j) && filter.sifat.includes(s);
                clickFilter(`${jenisLabel[j as Jenis]} · ${sifatLabel[s as Sifat]}`, (c) => (on ? { ...c, jenis: c.jenis.filter((v) => v !== j), sifat: c.sifat.filter((v) => v !== s) } : { ...c, jenis: [j], sifat: [s] }), !on);
              }}
            />
          </section>

          <section className="grid gap-5 *:min-w-0 xl:grid-cols-[1fr_1.15fr]">
            <Card data-reveal className="gap-3">
              <CardHeader>
                <CardTitle className="section-title">Frekuensi pemutakhiran (validitas)</CardTitle>
              </CardHeader>
              <CardContent className="min-h-80 flex-1">
                <BarChart
                  horizontal
                  legend={false}
                  labels={validitas.map((v) => v.value)}
                  series={[{ label: "Data", data: validitas.map((v) => v.count), colors: [...categorical] }]}
                  selected={validitas.flatMap((v, label) => (filter.validitas.includes(v.value) ? [{ label, series: 0 }] : []))}
                  onSelect={(label) => {
                    const value = validitas[label]!.value;
                    clickFilter(`Validitas ${value}`, (c) => ({ ...c, validitas: toggle(c.validitas, value) }), !filter.validitas.includes(value));
                  }}
                />
              </CardContent>
            </Card>
            <PdRankingCard
              title="Data per wali data"
              unit="data"
              label={radLabel}
              rows={pdRows}
              colorOf={tematikColor}
              selected={filter.pd}
              onToggle={(code) => clickFilter(pdName(code), (c) => ({ ...c, pd: toggle(c.pd, code) }), !filter.pd.includes(code))}
            />
          </section>

          <section className="grid gap-5 *:min-w-0 xl:grid-cols-[1.15fr_1fr]">
            <RabTreeCard tree={tree} total={rows.length} colorOf={tematikColor} colorLevel={2} title="Peta referensi data (RAD)" reference="RAD" levelLabel={radLevels} expandLabel="Buka data pokok" />
            <Card data-reveal className="gap-3">
              <CardHeader>
                <CardTitle className="section-title">Data tematik (RAD 2)</CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                <Treemap items={tematik} colorOf={(item) => tematikColor(item.code)} selected={filter.rad2} onToggle={(code) => clickFilter(radLabel(code), (c) => withRad(c, { rad2: toggle(c.rad2, code) }, rad), !filter.rad2.includes(code))} className="h-[22rem] sm:h-[26rem]" />
              </CardContent>
            </Card>
          </section>

          <DataTable
            title="Katalog data"
            rows={rows}
            rowId={(d) => d.id}
            searchText={(d) => `${d.id} ${d.name} ${d.uraian}`}
            searchPlaceholder="Cari nama, ID, atau uraian data"
            onRowClick={setSelected}
            pageSize={20}
            minWidth={1000}
            columns={[
              { header: "ID Data", className: "whitespace-nowrap", sortValue: (d) => d.id, cell: (d) => <span className="font-medium text-muted-foreground tabular-nums">{d.id}</span> },
              { header: "Nama data", sortValue: (d) => d.name, cell: (d) => <span className="font-semibold">{d.name}</span> },
              { header: "Sifat", hideable: true, sortValue: (d) => d.sifat, cell: (d) => <StatusBadge status={sifatLabel[d.sifat]} /> },
              { header: "Validitas", hideable: true, sortValue: (d) => validitasOptions.indexOf(d.validitas), cell: (d) => d.validitas },
              { header: "Wali data", hideable: true, sortValue: (d) => pdName(d.wali), cell: (d) => pdName(d.wali) },
              { header: "Interoperabilitas", hideable: true, sortValue: (d) => Number(d.interoperabel), cell: (d) => <StatusBadge status={interopLabel(d)} /> },
              { header: "Jenis", hideable: true, defaultHidden: true, sortValue: (d) => d.jenis, cell: (d) => jenisLabel[d.jenis] },
              { header: "Produsen", hideable: true, defaultHidden: true, sortValue: (d) => pdName(d.produsen), cell: (d) => pdName(d.produsen) },
              { header: "Uraian", hideable: true, defaultHidden: true, sortValue: (d) => d.uraian, cell: (d) => <span className="line-clamp-2 text-muted-foreground">{d.uraian}</span> },
              { header: "RAD 1", hideable: true, defaultHidden: true, sortValue: (d) => d.rad1, cell: (d) => <span className="text-muted-foreground">{radLabel(d.rad1)}</span> },
              { header: "RAD 2", hideable: true, defaultHidden: true, sortValue: (d) => d.rad2, cell: (d) => <span className="text-muted-foreground">{radLabel(d.rad2)}</span> },
              { header: "RAD 3", hideable: true, sortValue: (d) => d.rad3 ?? "", cell: (d) => <span className="text-muted-foreground">{d.rad3 ? radLabel(d.rad3) : "—"}</span> },
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
              <StatusBadge status={sifatLabel[selected.sifat]} />
              <StatusBadge status={interopLabel(selected)} />
              <Badge variant="info">{pdName(selected.wali)}</Badge>
            </>
          }
        >
          <DetailSection title="Uraian & tujuan" tone="accent">
            <p className="text-sm leading-relaxed">{selected.uraian}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{selected.tujuan}</p>
          </DetailSection>
          <DetailSection title="Klasifikasi RAD">
            <div className="grid gap-2 sm:grid-cols-3">
              {[selected.rad1, selected.rad2, selected.rad3].map((code, i) => (
                <DetailField key={i} label={`Level ${i + 1}${code ? ` · ${code}` : ""}`} value={code ? rad.byCode.get(code)?.name : "—"} />
              ))}
            </div>
          </DetailSection>
          <div className="grid gap-2 sm:grid-cols-2">
            <DetailField label="Produsen data" value={pdName(selected.produsen)} />
            <DetailField label="Wali data" value={pdName(selected.wali)} />
            <DetailField label="Jenis data" value={jenisLabel[selected.jenis]} />
            <DetailField label="Validitas" value={selected.validitas} />
            <DetailField label="Informasi terkait (output)" value={selected.output ?? "—"} />
            <DetailField label="Informasi terkait (input)" value={selected.input ?? "—"} />
          </div>
          <DetailSection title="Dependensi">
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { title: "Proses bisnis penghasil", items: selected.probis, empty: "Belum ditautkan ke proses bisnis." },
                { title: "Layanan pengguna", items: selected.layanan, empty: "Belum ditautkan ke layanan." },
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
          </DetailSection>
        </DetailDialog>
      )}
    </Reveal>
  );
}
