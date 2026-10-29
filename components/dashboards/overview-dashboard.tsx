"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useUrlParams } from "@/hooks/use-url-params";
import { Banner } from "@/components/blocks/banner";
import { EmptyState } from "@/components/blocks/empty-state";
import { FilterBar } from "@/components/blocks/filter-bar";
import { FilterChips, type Chip } from "@/components/blocks/filter-chips";
import { StatCard } from "@/components/blocks/stat-card";
import { MultiRingChart } from "@/components/charts";
import { DomainSankey, MiniComposition, OpdLeaderboard } from "./overview-visuals";
import { ExploreHint } from "@/components/dashboards/probis/explore-hint";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { domainKeys, domains } from "@/lib/domains";
import { domainTotals, filterSummary, type DomainSummary, type RelationSummary } from "@/lib/integrasi/model";
import type { PeriodOptions } from "@/lib/probis/reference";
import { metodeLabel } from "@/lib/layanan/reference";
import { sifatLabel } from "@/lib/data/reference";
import { basisLabel } from "@/lib/aplikasi/reference";

export function OverviewDashboard({ summary, relations, securityVisible, available, partial, periods }: {
  summary: DomainSummary[]; relations: RelationSummary[]; securityVisible: boolean; available: boolean; partial: boolean; periods: PeriodOptions;
}) {
  const params = useUrlParams();
  const router = useRouter();
  const [period, setPeriod] = useState(() => periods.periods.includes(params.get("periode") ?? "") ? params.get("periode")! : periods.active);
  const opdOptions = useMemo(() => [...new Map(summary.map((r) => [r.opd, { value: r.opd, label: r.opdName }])).values()].sort((a, b) => a.label.localeCompare(b.label)), [summary]);
  const [opds, setOpds] = useState<string[]>(() => (params.get("pd") ?? "").split(",").filter((code) => opdOptions.some((o) => o.value === code)));
  const update = (nextPeriod: string, nextOpds: string[]) => {
    setPeriod(nextPeriod); setOpds(nextOpds);
    const p = new URLSearchParams(); p.set("periode", nextPeriod); if (nextOpds.length) p.set("pd", nextOpds.join(","));
    window.history.replaceState(null, "", `?${p}`);
  };
  const filtered = filterSummary(summary, period, opds);
  const totals = domainTotals(filtered);
  const visible = domainKeys.filter((d) => d !== "keamanan" || securityVisible);
  const links = relations.filter((r) => r.period === period && (!opds.length || opds.includes(r.sourceOpd) || opds.includes(r.targetOpd)));
  const topOpds = opdOptions.map((o) => ({ ...o, count: filtered.filter((r) => r.opd === o.value).reduce((n, r) => n + r.count, 0) })).filter((o) => o.count).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  const chips: Chip[] = opds.map((opd) => ({ id: opd, group: "OPD", label: opdOptions.find((o) => o.value === opd)?.label ?? opd, onRemove: () => update(period, opds.filter((o) => o !== opd)) }));
  if (period !== periods.active) chips.push({ id: "periode", group: "Periode", label: period, onRemove: () => update(periods.active, opds) });
  const domainHref = (path: string) => `${path}?${new URLSearchParams({ periode: period, ...(opds.length ? { pd: opds.join(",") } : {}) })}`;
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
      ]} actions={<Button variant="ghost" onClick={() => update(periods.active, [])} disabled={!chips.length}>Reset filter</Button>}><FilterChips chips={chips} /></FilterBar>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {domainKeys.map((domain) => domain === "keamanan" && !securityVisible ? (
          <Card key={domain} className="justify-center px-5"><p className="text-sm font-semibold">Keamanan</p><p className="text-sm text-muted-foreground">Ringkasan memerlukan akses Dashboard Keamanan.</p><Button asChild variant="outline"><Link href="/keamanan">Buka Keamanan</Link></Button></Card>
        ) : <Link key={domain} href={domainHref(domains[domain].href)} className="rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"><StatCard label={domains[domain].label} value={totals[domain]} tone={domains[domain].tone} hint="Buka dashboard domain" /></Link>)}
      </div>
      {!filtered.length ? <Card><EmptyState title="Belum ada inventaris tervalidasi" description="Pilih OPD atau periode lain untuk melihat ringkasan." /></Card> : <>
        <section className="grid items-stretch gap-5 xl:grid-cols-[1.1fr_1fr]">
          <Card><CardHeader><CardTitle as="h2">Inventaris per Domain</CardTitle><p className="text-xs text-muted-foreground">Setiap cincin menunjukkan porsi domain dari total inventaris. Klik cincin atau legenda untuk menelusuri.</p></CardHeader><CardContent><MultiRingChart labels={visible.map((d) => domains[d].label)} values={visible.map((d) => totals[d])} onSelect={(i) => router.push(domainHref(domains[visible[i]].href))} /></CardContent></Card>
          <Card><CardHeader><CardTitle as="h2">Perangkat Daerah Terbanyak</CardTitle></CardHeader><CardContent><OpdLeaderboard rows={topOpds} onSelect={(opd) => update(period, [opd])} /></CardContent></Card>
        </section>
        <section className="grid gap-5 xl:grid-cols-3">
          {([
            { domain: "layanan", filter: "metode", title: "Metode layanan", labels: metodeLabel, color: "--brand-teal" },
            { domain: "data", filter: "sifat", title: "Sifat data", labels: sifatLabel, color: "--brand-orange" },
            { domain: "aplikasi", filter: "basis", title: "Basis aplikasi", labels: basisLabel, color: "--brand-amber" },
          ] as const).map((chart) => {
            const categories = new Map<string, number>();
            for (const r of filtered.filter((r) => r.domain === chart.domain)) categories.set(r.category, (categories.get(r.category) ?? 0) + r.count);
            const entries = [...categories];
            return <Card key={chart.domain}><CardHeader><CardTitle as="h2">{chart.title}</CardTitle></CardHeader><CardContent>{entries.length ? <MiniComposition labels={entries.map(([key]) => (chart.labels as Record<string, string>)[key] ?? key)} values={entries.map(([, count]) => count)} onSelect={(i) => router.push(`${domainHref(domains[chart.domain].href)}&${new URLSearchParams({ [chart.filter]: entries[i][0] })}`)} /> : <p className="text-sm text-muted-foreground">Belum ada data pada filter ini.</p>}</CardContent></Card>;
          })}
        </section>
        <Card><CardHeader className="flex flex-wrap items-center justify-between gap-3"><CardTitle as="h2">Hubungan domain</CardTitle><Button asChild variant="outline"><Link href={domainHref("/integrasi")}>Buka Integrasi Domain</Link></Button></CardHeader><CardContent className="grid gap-3">
          <p className="text-xs text-muted-foreground">Hubungan antarentri tervalidasi pada periode yang sama.{securityVisible && " Termasuk tautan Keamanan dari Data, Aplikasi, dan Infrastruktur."} Klik aliran untuk menelusuri di Integrasi Domain.</p>
          {partial && <p className="text-xs text-muted-foreground">Jumlah inventaris lengkap; ringkasan relasi dibatasi pada cakupan peta interaktif.</p>}
          <DomainSankey relations={links} href={(source) => `${domainHref("/integrasi")}&domain=${source}`} />
        </CardContent></Card>
      </>}
    </Reveal>
  );
}
