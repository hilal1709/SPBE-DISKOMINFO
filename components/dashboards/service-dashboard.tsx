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
import { TargetMetodeCard } from "@/components/dashboards/layanan/target-metode";
import { ExploreHint } from "@/components/dashboards/probis/explore-hint";
import { PdRankingCard, type PdRow } from "@/components/dashboards/probis/pd-ranking";
import { RabTreeCard } from "@/components/dashboards/probis/rab-tree";
import { Icon } from "@/components/icon";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { allLayanan } from "@/lib/layanan/generate";
import { activeFilterCount, countBy, emptyFilter, filterFromParams, filterLayanan, filterToParams, ralOptions, ralTree, sanitizeFilter, type LayananFilter } from "@/lib/layanan/query";
import { colorByRoot } from "@/lib/palette";
import { useRalSet } from "@/components/layanan/ral-context";
import { RAL_PUBLIK, isDigital, metodeLabel, metodeOptions, targetLabel, targetOptions, type Metode, type Target } from "@/lib/layanan/reference";
import type { RabIndex } from "@/lib/probis/rab-index";
import { pdByCode, perangkatDaerah, sampleRab, type PeriodOptions } from "@/lib/probis/reference";
import type { Layanan } from "@/lib/types";

const fmt = new Intl.NumberFormat("id-ID");
const pdName = (code: string) => pdByCode.get(code)?.name ?? code;
const pdOptions = perangkatDaerah.map((pd) => ({ value: pd.code, label: pd.name }));
const toOptions = (nodes: { code: string; name: string }[]) => nodes.map((n) => ({ value: n.code, label: `${n.code} ${n.name}` }));
const toggle = (list: string[], value: string) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
const ralLevels = ["", "Jenis", "Urusan", "Sub-urusan"];
const metodeTone: Record<Metode, string> = { elektronik: "bg-brand-teal", hybrid: "bg-brand-yellow", tatap_muka: "bg-brand-orange" };

type RalKey = "ral1" | "ral2" | "ral3";

/** RAL bertingkat: buang pilihan turunan yang tidak lagi berada di bawah induk terpilih. */
function withRal(current: LayananFilter, patch: Partial<Pick<LayananFilter, RalKey>>, ral: RabIndex) {
  const next = { ...current, ...patch };
  for (const [key, level] of [["ral2", "level2"], ["ral3", "level3"]] as const) {
    const allowed = new Set(ralOptions(next, ral)[level].map((n) => n.code));
    next[key] = next[key].filter((c) => allowed.has(c));
  }
  return next;
}

/** Dashboard publik Domain Layanan. Semua widget mengikuti filter aktif. */
export function ServiceDashboard({
  data,
  sample,
  periods: { periods, active: activePeriod },
}: {
  /** Layanan disetujui dari database; null = data contoh bawaan. */
  data: Layanan[] | null;
  sample: boolean;
  periods: PeriodOptions;
}) {
  const params = useSearchParams();
  const rals = useRalSet();
  const all = useMemo(() => data ?? allLayanan(), [data]);
  const [filter, setFilterState] = useState<LayananFilter>(() => {
    const parsed = filterFromParams(new URLSearchParams(params.toString()), activePeriod);
    const ral = rals.forPeriod(periods.includes(parsed.period) ? parsed.period : activePeriod);
    const valid = { periods, defaultPeriod: activePeriod, pd: new Set([...pdByCode.keys(), ...all.map((l) => l.pd)]), target: new Set(Object.keys(targetLabel)), metode: new Set(Object.keys(metodeLabel)), ral };
    // RAL turunan yang tidak berada di bawah induk terpilih juga dibuang.
    return withRal(sanitizeFilter(parsed, valid), {}, ral);
  });
  const [selected, setSelected] = useState<Layanan | null>(null);
  /** Filter terbaru, untuk aksi tertunda (animasi chip, Urungkan di toast). */
  const latest = useRef(filter);

  /** Simpan filter di URL agar tampilan bisa dibagikan, tanpa memicu navigasi. */
  const setFilter = (next: LayananFilter | ((current: LayananFilter) => LayananFilter)) => {
    const value = typeof next === "function" ? next(latest.current) : next;
    latest.current = value;
    setFilterState(value);
    const query = filterToParams(value, activePeriod).toString();
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  };
  const setRal = (patch: Partial<Pick<LayananFilter, RalKey>>) => setFilter((current) => withRal(current, patch, rals.forPeriod(current.period)));

  /** Klik petak/baris: filter langsung diterapkan, toast menawarkan Urungkan. */
  const clickFilter = (label: string, apply: (current: LayananFilter) => LayananFilter, adding: boolean) => {
    const before = latest.current;
    setFilter(apply);
    if (adding) toast("Filter diterapkan", { description: label, action: { label: "Urungkan", onClick: () => setFilter(before) } });
  };

  const rows = useMemo(() => filterLayanan(all, filter), [all, filter]);
  /** Widget yang juga berfungsi sebagai filter memakai data tanpa filternya sendiri, agar pilihan lain tetap terlihat. */
  const withoutRal2 = useMemo(() => filterLayanan(all, { ...filter, ral2: [] }), [all, filter]);
  const withoutPd = useMemo(() => filterLayanan(all, { ...filter, pd: [] }), [all, filter]);
  const withoutTargetMetode = useMemo(() => filterLayanan(all, { ...filter, target: [], metode: [] }), [all, filter]);

  /** Referensi RAL mengikuti versi milik periode yang dipilih. */
  const ral = useMemo(() => rals.forPeriod(filter.period), [rals, filter.period]);
  const ralLabel = ral.label;
  const options = ralOptions(filter, ral);
  const tree = useMemo(() => ralTree(rows, ral), [rows, ral]);
  /** Satu warna per urusan (RAL 2), dipakai sama di treemap dan ranking. */
  const urusanColor = useMemo(() => colorByRoot(ral.level(2).map((n) => n.code)), [ral]);
  const jenis = countBy(rows, "ral1");
  const metode = countBy(rows, "metode");
  const digital = rows.filter((l) => isDigital(l.metode)).length;
  const pdCount = countBy(rows, "pd").size;
  const publik = jenis.get(RAL_PUBLIK) ?? 0;
  const urusan = [...countBy(withoutRal2, "ral2")].map(([code, value]) => ({ code, value, label: ral.byCode.get(code)?.name ?? code }));
  const pdRows = useMemo<PdRow[]>(() => {
    const groups = new Map<string, Layanan[]>();
    for (const l of withoutPd) groups.set(l.pd, [...(groups.get(l.pd) ?? []), l]);
    return [...groups]
      .map(([code, list]) => ({ code, name: pdName(code), count: list.length, sektor: [...countBy(list, "ral2")].sort((a, b) => b[1] - a[1]) }))
      .sort((a, b) => b.count - a.count);
  }, [withoutPd]);

  const active = activeFilterCount(filter, activePeriod);
  const removeFrom = (key: "pd" | "target" | "metode", code: string) => () => setFilter((c) => ({ ...c, [key]: c[key].filter((v) => v !== code) }));
  const chips: Chip[] = [
    ...filter.pd.map((code) => ({ id: `pd:${code}`, group: "PD", label: pdName(code), onRemove: removeFrom("pd", code) })),
    ...filter.target.map((code) => ({ id: `target:${code}`, group: "Target", label: targetLabel[code as Target], onRemove: removeFrom("target", code) })),
    ...filter.metode.map((code) => ({ id: `metode:${code}`, group: "Metode", label: metodeLabel[code as Metode], onRemove: removeFrom("metode", code) })),
    ...(filter.period !== activePeriod ? [{ id: "period", group: "Periode", label: filter.period, onRemove: () => setFilter((c) => ({ ...c, period: activePeriod })) }] : []),
    ...(["ral1", "ral2", "ral3"] as const).flatMap((key, i) =>
      filter[key].map((code) => ({ id: `${key}:${code}`, group: `RAL ${i + 1}`, label: ralLabel(code), onRemove: () => setRal({ [key]: latest.current[key].filter((v) => v !== code) }) })),
    ),
  ];
  const total = rows.length || 1;

  return (
    <Reveal className="grid gap-5">
      <ExploreHint
        sample={sample}
        storageKey="spbe:layanan-hint"
        illustration="service-desk"
        tips={[
          "Klik petak matriks, urusan, atau nama Perangkat Daerah untuk memfilter seluruh dashboard.",
          "Layanan dengan metode Elektronik atau Hybrid dihitung terdigitalisasi.",
          "Klik baris katalog untuk melihat tujuan, risiko, dan proses bisnis yang dilayani.",
        ]}
      />
      <FilterBar
        filters={[
          { label: "Perangkat Daerah", wide: true, multiple: true, searchable: true, options: pdOptions, values: filter.pd, onValuesChange: (pd) => setFilter((c) => ({ ...c, pd })) },
          { label: "Target", multiple: true, options: targetOptions, values: filter.target, onValuesChange: (target) => setFilter((c) => ({ ...c, target })) },
          { label: "Metode", multiple: true, options: metodeOptions, values: filter.metode, onValuesChange: (metode) => setFilter((c) => ({ ...c, metode })) },
          { label: "Periode", required: true, options: [...periods], value: filter.period, onChange: (period) => setFilter((c) => ({ ...c, period })) },
          { label: "RAL 1", multiple: true, options: toOptions(options.level1), values: filter.ral1, onValuesChange: (ral1) => setRal({ ral1 }) },
          { label: "RAL 2", multiple: true, searchable: true, options: toOptions(options.level2), values: filter.ral2, onValuesChange: (ral2) => setRal({ ral2 }) },
          { label: "RAL 3", multiple: true, searchable: true, options: toOptions(options.level3), values: filter.ral3, onValuesChange: (ral3) => setRal({ ral3 }) },
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
          <EmptyState illustration="filter-empty" title="Tidak ada layanan" description="Tidak ada layanan yang cocok dengan kombinasi filter ini. Hapus salah satu chip filter atau reset semuanya.">
            <Button variant="outline" onClick={() => setFilter(emptyFilter(activePeriod))}>Reset filter</Button>
          </EmptyState>
        </Card>
      ) : (
        <>
          <section className="grid gap-5 *:min-w-0 lg:grid-cols-2 xl:grid-cols-[minmax(0,18rem)_minmax(0,1fr)_minmax(0,1fr)]">
            <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2 xl:col-span-1 xl:grid-cols-1 xl:grid-rows-2">
              <StatCard
                className="justify-center"
                tone="teal"
                label="Jumlah layanan"
                value={rows.length}
                footer={
                  <div className="mt-2 grid gap-1.5">
                    <div className="flex h-2 overflow-hidden rounded-full bg-brand-charcoal/10" aria-hidden>
                      <span className="h-full bg-white transition-[width] duration-700 ease-(--ease-out)" style={{ width: `${(publik / total) * 100}%` }} />
                    </div>
                    <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-white" />
                        Publik <b className="tabular-nums">{fmt.format(publik)}</b>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-brand-charcoal/30" />
                        Administrasi pemerintahan <b className="tabular-nums">{fmt.format(rows.length - publik)}</b>
                      </span>
                    </p>
                  </div>
                }
              />
              <StatCard className="justify-center" tone="orange" label="Perangkat Daerah pemilik layanan" value={pdCount} hint={`dari ${perangkatDaerah.length} Perangkat Daerah`} />
            </div>

            <Card data-reveal className="gap-3">
              <CardHeader>
                <CardTitle className="section-title">Digitalisasi layanan</CardTitle>
              </CardHeader>
              <CardContent className="grid flex-1 content-center gap-5">
                <Gauge value={(digital / total) * 100} label="Persentase layanan terdigitalisasi" caption={`${fmt.format(digital)} dari ${fmt.format(rows.length)} layanan`} />
                <div className="grid gap-2">
                  <div className="flex h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
                    {metodeOptions.map((m) => (
                      <span key={m.value} className={`${metodeTone[m.value]} h-full transition-[width] duration-700 ease-(--ease-out)`} style={{ width: `${((metode.get(m.value) ?? 0) / total) * 100}%` }} />
                    ))}
                  </div>
                  <p className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
                    {metodeOptions.map((m) => (
                      <span key={m.value} className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <span className={`size-2 rounded-full ${metodeTone[m.value]}`} />
                        {m.label} <b className="text-foreground tabular-nums">{fmt.format(metode.get(m.value) ?? 0)}</b>
                      </span>
                    ))}
                  </p>
                </div>
              </CardContent>
            </Card>

            <TargetMetodeCard
              rows={withoutTargetMetode}
              target={filter.target}
              metode={filter.metode}
              onSelect={(t, m) => {
                const on = filter.target.includes(t) && filter.metode.includes(m);
                clickFilter(`${targetLabel[t as Target]} · ${metodeLabel[m as Metode]}`, (c) => (on ? { ...c, target: c.target.filter((v) => v !== t), metode: c.metode.filter((v) => v !== m) } : { ...c, target: [t], metode: [m] }), !on);
              }}
            />
          </section>

          <section className="grid gap-5 *:min-w-0 xl:grid-cols-[1.15fr_1fr]">
            <RabTreeCard tree={tree} total={rows.length} title="Peta referensi layanan (RAL)" reference="RAL" levelLabel={ralLevels} expandLabel="Buka jenis" defaultExpanded />
            <PdRankingCard
              title="Layanan per Perangkat Daerah"
              unit="layanan"
              label={ralLabel}
              rows={pdRows}
              colorOf={urusanColor}
              selected={filter.pd}
              onToggle={(code) => clickFilter(pdName(code), (c) => ({ ...c, pd: toggle(c.pd, code) }), !filter.pd.includes(code))}
            />
          </section>

          <Card data-reveal className="gap-3">
            <CardHeader>
              <CardTitle className="section-title">Urusan layanan (RAL 2)</CardTitle>
            </CardHeader>
            <CardContent>
              <Treemap items={urusan} colorOf={(item) => urusanColor(item.code)} selected={filter.ral2} onToggle={(code) => clickFilter(ralLabel(code), (c) => withRal(c, { ral2: toggle(c.ral2, code) }, ral), !filter.ral2.includes(code))} className="h-[22rem] sm:h-[26rem]" />
            </CardContent>
          </Card>

          <DataTable
            title="Katalog layanan"
            rows={rows}
            rowId={(l) => l.id}
            searchText={(l) => `${l.id} ${l.name} ${l.tujuan}`}
            searchPlaceholder="Cari nama, ID, atau tujuan layanan"
            onRowClick={setSelected}
            pageSize={20}
            minWidth={960}
            columns={[
              { header: "ID Layanan", className: "whitespace-nowrap", sortValue: (l) => l.id, cell: (l) => <span className="font-medium text-muted-foreground tabular-nums">{l.id}</span> },
              { header: "Nama layanan", sortValue: (l) => l.name, cell: (l) => <span className="font-semibold">{l.name}</span> },
              { header: "Metode", hideable: true, sortValue: (l) => metodeLabel[l.metode], cell: (l) => <StatusBadge status={metodeLabel[l.metode]} /> },
              { header: "Target", hideable: true, sortValue: (l) => targetLabel[l.target], cell: (l) => targetLabel[l.target] },
              { header: "Perangkat Daerah", hideable: true, sortValue: (l) => pdName(l.pd), cell: (l) => pdName(l.pd) },
              { header: "Tujuan", hideable: true, defaultHidden: true, sortValue: (l) => l.tujuan, cell: (l) => <span className="line-clamp-2 text-muted-foreground">{l.tujuan}</span> },
              { header: "RAL 1", hideable: true, defaultHidden: true, sortValue: (l) => l.ral1, cell: (l) => <span className="text-muted-foreground">{ralLabel(l.ral1)}</span> },
              { header: "RAL 2", hideable: true, defaultHidden: true, sortValue: (l) => l.ral2, cell: (l) => <span className="text-muted-foreground">{ralLabel(l.ral2)}</span> },
              { header: "RAL 3", hideable: true, sortValue: (l) => l.ral3, cell: (l) => <span className="text-muted-foreground">{ralLabel(l.ral3)}</span> },
              { header: "Urusan (RAB 2)", hideable: true, defaultHidden: true, sortValue: (l) => l.rab2 ?? "", cell: (l) => <span className="text-muted-foreground">{l.rab2 ? sampleRab.label(l.rab2) : "—"}</span> },
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
              <StatusBadge status={metodeLabel[selected.metode]} />
              <Badge variant="info">{pdName(selected.pd)}</Badge>
            </>
          }
        >
          <DetailSection title="Tujuan & fungsi" tone="accent">
            <p className="text-sm leading-relaxed">{selected.tujuan}</p>
            {selected.fungsi && <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{selected.fungsi}</p>}
          </DetailSection>
          <DetailSection title="Klasifikasi RAL">
            <div className="grid gap-2 sm:grid-cols-3">
              {[selected.ral1, selected.ral2, selected.ral3].map((code, i) => (
                <DetailField key={code} label={`Level ${i + 1} · ${code}`} value={ral.byCode.get(code)?.name} />
              ))}
            </div>
          </DetailSection>
          <div className="grid gap-2 sm:grid-cols-2">
            <DetailField label="Target layanan" value={targetLabel[selected.target]} />
            <DetailField label="Unit pelaksana" value={selected.unit || "—"} />
            <DetailField label="Urusan pemerintahan" value={selected.rab2 ? sampleRab.label(selected.rab2) : "—"} />
            <DetailField label="Kementerian/Lembaga terkait" value={selected.kl ?? "—"} />
            <DetailField label="Potensi manfaat" value={selected.manfaat ?? "—"} />
            <DetailField label="Potensi ekonomi" value={selected.ekonomi ?? "—"} />
          </div>
          {selected.risiko && (
            <DetailSection title="Risiko & mitigasi">
              <div className="grid gap-2 sm:grid-cols-2">
                <DetailField label="Potensi risiko" value={selected.risiko} />
                <DetailField label="Mitigasi" value={selected.mitigasi ?? "—"} />
              </div>
            </DetailSection>
          )}
          <DetailSection title="Proses bisnis yang dilayani">
            {selected.probis.length ? (
              <ul className="grid gap-1.5 text-sm">
                {selected.probis.map((p) => (
                  <li key={p.id} className="flex items-baseline gap-2">
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{p.id}</span>
                    {p.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Belum ditautkan ke proses bisnis.</p>
            )}
          </DetailSection>
        </DetailDialog>
      )}
    </Reveal>
  );
}
