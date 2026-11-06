"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { useUrlParams } from "@/hooks/use-url-params";
import { Banner } from "@/components/blocks/banner";
import { DetailDialog, DetailField } from "@/components/blocks/detail-dialog";
import { EmptyState } from "@/components/blocks/empty-state";
import { FilterBar } from "@/components/blocks/filter-bar";
import { FilterChips, type Chip } from "@/components/blocks/filter-chips";
import { StatCard } from "@/components/blocks/stat-card";
import { StatRow } from "@/components/blocks/stat-row";
import { MultiRingChart } from "@/components/charts";
import { DomainSankey, MiniComposition, OpdLeaderboard } from "./overview-visuals";
import { ExploreHint } from "@/components/dashboards/probis/explore-hint";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { domainKeys, domains, type DomainKey } from "@/lib/domains";
import { formatNumber } from "@/lib/format";
import { domainTotals, filterSummary, type DomainSummary, type RelationSummary } from "@/lib/integrasi/model";
import type { PeriodOptions } from "@/lib/probis/reference";
import { metodeLabel } from "@/lib/layanan/reference";
import { sifatLabel } from "@/lib/data/reference";
import { basisLabel } from "@/lib/aplikasi/reference";

const compositions = [
  { domain: "layanan", filter: "metode", title: "Metode layanan", labels: metodeLabel },
  { domain: "data", filter: "sifat", title: "Sifat data", labels: sifatLabel },
  { domain: "aplikasi", filter: "basis", title: "Basis aplikasi", labels: basisLabel },
] as const;

type View = { period: string; opds: string[] };

export function OverviewDashboard({ summary, relations, securityVisible, available, partial, periods }: {
  summary: DomainSummary[]; relations: RelationSummary[]; securityVisible: boolean; available: boolean; partial: boolean; periods: PeriodOptions;
}) {
  const params = useUrlParams();
  const router = useRouter();
  const opdOptions = useMemo(() => [...new Map(summary.map((r) => [r.opd, { value: r.opd, label: r.opdName }])).values()].sort((a, b) => a.label.localeCompare(b.label)), [summary]);
  const [view, setView] = useState<View>(() => ({
    period: periods.periods.includes(params.get("periode") ?? "") ? params.get("periode")! : periods.active,
    opds: (params.get("pd") ?? "").split(",").filter((code) => opdOptions.some((o) => o.value === code)),
  }));
  const { period, opds } = view;
  const [detail, setDetail] = useState<string | null>(null);

  const update = (nextPeriod: string, nextOpds: string[]) => {
    const next = { period: nextPeriod, opds: nextOpds };
    setView(next);
    const p = new URLSearchParams(); p.set("periode", nextPeriod); if (nextOpds.length) p.set("pd", nextOpds.join(","));
    window.history.replaceState(null, "", `?${p}`);
  };
  /** Ubah filter lalu tawarkan Urungkan, sama seperti dashboard domain. */
  const updateWithUndo = (title: string, description: string | undefined, nextPeriod: string, nextOpds: string[]) => {
    const before = view;
    update(nextPeriod, nextOpds);
    toast(title, { description, action: { label: "Urungkan", onClick: () => update(before.period, before.opds) } });
  };

  const filtered = useMemo(() => filterSummary(summary, period, opds), [summary, period, opds]);
  const totals = useMemo(() => domainTotals(filtered), [filtered]);
  const visible = useMemo(() => domainKeys.filter((d) => d !== "keamanan" || securityVisible), [securityVisible]);
  const ring = useMemo(() => ({ labels: visible.map((d) => domains[d].label), values: visible.map((d) => totals[d]) }), [visible, totals]);
  const links = useMemo(() => relations.filter((r) => r.period === period && (!opds.length || (opds.includes(r.sourceOpd) && opds.includes(r.targetOpd))) && r.source !== r.target), [relations, period, opds]);
  /** Satu lintasan: jumlah per OPD dan rincian per domain (untuk peringkat dan dialog detail). */
  const byOpd = useMemo(() => {
    const map = new Map<string, Partial<Record<DomainKey, number>>>();
    for (const r of filtered) {
      const row = map.get(r.opd) ?? {};
      row[r.domain] = (row[r.domain] ?? 0) + r.count;
      map.set(r.opd, row);
    }
    return map;
  }, [filtered]);
  const topOpds = useMemo(() => opdOptions
    .map((o) => ({ ...o, count: Object.values(byOpd.get(o.value) ?? {}).reduce((n, c) => n + (c ?? 0), 0) }))
    .filter((o) => o.count)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)), [opdOptions, byOpd]);
  const composition = useMemo(() => compositions.map((chart) => {
    const categories = new Map<string, number>();
    for (const r of filtered) if (r.domain === chart.domain) categories.set(r.category, (categories.get(r.category) ?? 0) + r.count);
    const keys = [...categories.keys()];
    return { ...chart, keys, labels: keys.map((key) => (key ? ((chart.labels as Record<string, string>)[key] ?? key) : "Tidak diketahui")), values: [...categories.values()] };
  }), [filtered]);

  const query = (pd: string[]) => new URLSearchParams({ periode: period, ...(pd.length ? { pd: pd.join(",") } : {}) });
  const domainHref = (path: string, pd = opds) => `${path}?${query(pd)}`;
  const openRing = useCallback((i: number) => router.push(`${domains[visible[i]].href}?${new URLSearchParams({ periode: period, ...(opds.length ? { pd: opds.join(",") } : {}) })}`), [router, visible, period, opds]);

  const opdLabel = (code: string) => opdOptions.find((o) => o.value === code)?.label ?? code;
  const chips: Chip[] = [
    ...opds.map((opd) => ({ id: opd, group: "OPD", label: opdLabel(opd), onRemove: () => update(period, opds.filter((o) => o !== opd)) })),
    ...(period !== periods.active ? [{ id: "periode", group: "Periode", label: period, onRemove: () => update(periods.active, opds) }] : []),
  ];
  const detailRow = detail ? byOpd.get(detail) ?? {} : {};
  const detailTotal = Object.values(detailRow).reduce((n, c) => n + (c ?? 0), 0);

  return (
    <Reveal className="grid gap-5">
      <ExploreHint
        storageKey="spbe:overview-hint"
        illustration="spbe-overview"
        sample={filtered.some((r) => r.sample)}
        title="Ringkasan Arsitektur SPBE"
        description="Pantau gambaran keseluruhan enam domain SPBE melalui statistik dan visualisasi. Pilih domain atau grafik untuk melihat informasi lebih detail."
        tips={[]}
      />
      {!available && <Banner variant="warning" label="Data belum tersedia" dismissible={false}>Ringkasan belum dapat dibaca. Konfigurasi database tidak diubah; coba muat ulang nanti.</Banner>}
      <FilterBar filters={[
        { label: "Perangkat Daerah", multiple: true, searchable: true, options: opdOptions, values: opds, onValuesChange: (v) => update(period, v), wide: true },
        { label: "Periode", required: true, options: periods.periods, value: period, onChange: (v) => update(v, opds) },
      ]} actions={<Button variant="ghost" onClick={() => updateWithUndo("Filter direset", undefined, periods.active, [])} disabled={!chips.length}>Reset filter</Button>}><FilterChips chips={chips} /></FilterBar>
      <StatRow>
        {domainKeys.map((domain) => domain === "keamanan" && !securityVisible ? (
          <Card key={domain} className="justify-center px-5" data-reveal><p className="text-sm font-semibold">Keamanan</p><p className="text-sm text-muted-foreground">Ringkasan memerlukan akses Dashboard Keamanan.</p><Button asChild variant="outline"><Link href="/keamanan">Buka Keamanan</Link></Button></Card>
        ) : <Link key={domain} href={domainHref(domains[domain].href)} className="block h-full rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"><StatCard className="h-full" label={domains[domain].label} value={totals[domain]} tone={domains[domain].tone} hint="Buka dashboard domain" /></Link>)}
      </StatRow>
      {!filtered.length ? <Card data-reveal><EmptyState illustration="filter-empty" title="Belum ada inventaris tervalidasi" description="Pilih OPD atau periode lain untuk melihat ringkasan." /></Card> : <>
        <section className="grid items-stretch gap-5 *:min-w-0 xl:grid-cols-[1.1fr_1fr]">
          <div data-aos="fade-blur" suppressHydrationWarning className="grid"><Card><CardHeader><CardTitle as="h2">Inventaris per Domain</CardTitle><p className="text-xs text-muted-foreground">Setiap cincin menunjukkan porsi domain dari total inventaris. Klik cincin atau legenda untuk menelusuri.</p></CardHeader><CardContent><MultiRingChart labels={ring.labels} values={ring.values} onSelect={openRing} /></CardContent></Card></div>
          <div data-aos="fade-blur" data-aos-delay="80" suppressHydrationWarning className="grid"><Card><CardHeader><CardTitle as="h2">Perangkat Daerah Terbanyak</CardTitle></CardHeader><CardContent><OpdLeaderboard rows={topOpds} onSelect={setDetail} /></CardContent></Card></div>
        </section>
        <section className="grid gap-5 *:min-w-0 xl:grid-cols-3">
          {composition.map((chart, ci) => (
            <div key={chart.domain} data-aos="fade-blur" data-aos-delay={ci * 80} suppressHydrationWarning className="grid">
              <Card><CardHeader><CardTitle as="h2">{chart.title}</CardTitle></CardHeader><CardContent>{chart.keys.length ? <MiniComposition labels={chart.labels} values={chart.values} onSelect={(i) => router.push(`${domainHref(domains[chart.domain].href)}&${new URLSearchParams({ [chart.filter]: chart.keys[i] })}`)} /> : <p className="text-sm text-muted-foreground">Belum ada data pada filter ini.</p>}</CardContent></Card>
            </div>
          ))}
        </section>
        <div data-aos="fade-blur" suppressHydrationWarning>
          <Card><CardHeader className="flex flex-wrap items-center justify-between gap-3"><CardTitle as="h2">Hubungan domain</CardTitle><Button asChild variant="outline"><Link href={domainHref("/integrasi")}>Buka Integrasi Domain</Link></Button></CardHeader><CardContent className="grid gap-3">
            <p className="text-xs text-muted-foreground">Hubungan antarentri tervalidasi pada periode yang sama.{securityVisible && " Termasuk tautan Keamanan dari Data, Aplikasi, dan Infrastruktur."} Klik aliran untuk menelusuri di Integrasi Domain.</p>
            {partial && <p className="text-xs text-muted-foreground">Jumlah inventaris lengkap; ringkasan relasi dibatasi pada cakupan peta interaktif.</p>}
            <DomainSankey relations={links} href={(source) => `${domainHref("/integrasi")}&domain=${source}`} />
          </CardContent></Card>
        </div>
      </>}
      <DetailDialog
        open={!!detail}
        onOpenChange={(open) => !open && setDetail(null)}
        eyebrow="Perangkat Daerah"
        title={detail ? opdLabel(detail) : ""}
        description={`${formatNumber(detailTotal)} inventaris tervalidasi · Periode ${period}`}
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {visible.map((d) => (
            <Link key={d} href={detail ? domainHref(domains[d].href, [detail]) : "#"} className="rounded-xl focus-visible:outline-2 focus-visible:outline-ring">
              <DetailField label={domains[d].label} value={<span className="tabular-nums">{formatNumber(detailRow[d] ?? 0)}</span>} className="transition-colors hover:bg-muted" />
            </Link>
          ))}
        </div>
        {detail && !opds.includes(detail) && (
          <Button variant="outline" className="justify-self-start" onClick={() => { const code = detail; setDetail(null); updateWithUndo("Filter diterapkan", opdLabel(code), period, [code]); }}>
            Filter ringkasan ke OPD ini
          </Button>
        )}
      </DetailDialog>
    </Reveal>
  );
}
