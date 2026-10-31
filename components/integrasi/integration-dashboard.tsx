"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ExploreHint } from "@/components/dashboards/probis/explore-hint";
import { useMemo, useState } from "react";
import { useUrlParams } from "@/hooks/use-url-params";
import { DomainMap } from "@/components/integrasi/domain-map";
import { RecordMap } from "@/components/integrasi/record-map";
import { Banner } from "@/components/blocks/banner";
import { DataTable } from "@/components/blocks/data-table";
import { DetailDialog, DetailField } from "@/components/blocks/detail-dialog";
import { EmptyState } from "@/components/blocks/empty-state";
import { FilterBar } from "@/components/blocks/filter-bar";
import { FilterChips, type Chip } from "@/components/blocks/filter-chips";
import { Segmented } from "@/components/blocks/segmented";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { domainKeys, domains, isDomain } from "@/lib/domains";
import { analyzeImpact, type Architecture, type DomainNode } from "@/lib/integrasi/model";
import type { PeriodOptions } from "@/lib/probis/reference";

const storageLabel = { junction: "Relasi tersimpan", jsonb: "Referensi JSONB", text: "Referensi kode/nama" };
export function IntegrationDashboard({ data, periods }: { data: Architecture; periods: PeriodOptions }) {
  const params = useUrlParams();
  const router = useRouter();
  const [period, setPeriod] = useState(() => periods.periods.includes(params.get("periode") ?? "") ? params.get("periode")! : periods.active);
  const opdOptions = useMemo(() => [...new Map(data.summary.map((n) => [n.opd, { value: n.opd, label: n.opdName }])).values()].sort((a, b) => a.label.localeCompare(b.label)), [data.summary]);
  const [opds, setOpds] = useState<string[]>(() => (params.get("pd") ?? "").split(",").filter((v) => opdOptions.some((o) => o.value === v)));
  const [domain, setDomain] = useState(() => isDomain(params.get("domain")) && (params.get("domain") !== "keamanan" || data.securityVisible) ? params.get("domain")! : "__all");
  const [selectedId, setSelectedId] = useState(params.get("record") ?? "");
  const [mode, setMode] = useState<"change" | "delete">("change");
  const [detail, setDetail] = useState<DomainNode | null>(null);
  const update = (p: string, o: string[], d = domain, record = selectedId) => {
    setPeriod(p); setOpds(o); setDomain(d); setSelectedId(record);
    const q = new URLSearchParams({ periode: p });
    if (o.length) q.set("pd", o.join(",")); if (d !== "__all") q.set("domain", d); if (record) q.set("record", record);
    if (p !== period) router.replace(`?${q}`, { scroll: false });
    else window.history.replaceState(null, "", `?${q}`);
  };
  const scoped = useMemo(() => data.nodes.filter((n) => n.period === period && (!opds.length || opds.includes(n.opd))), [data.nodes, period, opds]);
  const scopedIds = useMemo(() => new Set(scoped.map((n) => n.id)), [scoped]);
  const edges = useMemo(() => data.edges.filter((e) => scopedIds.has(e.source) && scopedIds.has(e.target)), [data.edges, scopedIds]);
  const selected = scoped.find((n) => n.id === selectedId) ?? null;
  const matches = useMemo(() => scoped.filter((n) => domain === "__all" || n.domain === domain), [scoped, domain]);
  const impacts = useMemo(() => analyzeImpact(scoped, edges, selected?.id ?? "", mode, false), [scoped, edges, selected, mode]);
  const directEdges = edges.filter((e) => e.source === selected?.id || e.target === selected?.id);
  const byId = new Map(scoped.map((n) => [n.id, n]));
  const chips: Chip[] = opds.map((opd) => ({ id: opd, group: "OPD", label: opdOptions.find((o) => o.value === opd)?.label ?? opd, onRemove: () => update(period, opds.filter((o) => o !== opd)) }));
  if (domain !== "__all" && isDomain(domain)) chips.push({ id: "domain", group: "Domain", label: domains[domain].label, onRemove: () => update(period, opds, "__all") });
  if (period !== periods.active) chips.push({ id: "periode", group: "Periode", label: period, onRemove: () => update(periods.active, opds, domain, "") });
  const choose = (node: DomainNode) => {
    const next = selectedId === node.id ? "" : node.id;
    update(period, opds, domain, next);
    toast(next ? (selected ? "Pilihan data diganti" : "Data dipilih") : "Pilihan data dilepas", {
      description: node.name,
      action: { label: "Urungkan", onClick: () => update(period, opds, domain, selectedId) },
    });
  };
  const chooseDomain = (d: typeof domainKeys[number]) => {
    const next = domain === d ? "__all" : d;
    update(period, opds, next, "");
    toast(next === "__all" ? "Filter dilepas" : "Filter diterapkan", {
      description: domains[d].label,
      action: { label: "Urungkan", onClick: () => update(period, opds, domain, selectedId) },
    });
  };
  return <Reveal className="grid gap-5">
    <ExploreHint
      illustration="domain-integration"
      sample={data.summary.some((r) => r.sample && r.period === period && (!opds.length || opds.includes(r.opd)))}
      title="Panduan Integrasi Domain"
      description="Lihat ringkasan hubungan antardomain. Klik domain untuk menelusuri record dan pilih record bila ingin melihat dampaknya."
      tips={[]}
    />
    {!data.available && <Banner label="Data belum tersedia" variant="warning" dismissible={false}>Peta belum dapat dibaca dari database. Tidak ada perubahan data yang dijalankan.</Banner>}
    {!data.securityVisible && <Banner label="Cakupan publik" dismissible={false}>Kegiatan dan referensi Keamanan tidak disertakan. Infrastruktur hanya menampilkan identitas dan hubungan tervalidasi. <Link className="underline" href="/keamanan">Akses Keamanan</Link></Banner>}
    {data.partial && <Banner label="Cakupan terbatas" variant="warning" dismissible={false}>Peta dibatasi untuk menjaga performa. Dampak belum menyeluruh; verifikasi lanjutan diperlukan sebelum mengambil keputusan.</Banner>}
    <FilterBar filters={[
      { label: "Domain", options: domainKeys.filter((d) => d !== "keamanan" || data.securityVisible).map((d) => ({ value: d, label: domains[d].label })), value: domain, onChange: (v) => update(period, opds, v), wide: true },
      { label: "Perangkat Daerah", multiple: true, searchable: true, options: opdOptions, values: opds, onValuesChange: (v) => update(period, v) },
      { label: "Periode", required: true, options: periods.periods, value: period, onChange: (v) => update(v, opds, domain, "") },
    ]} actions={<Button variant="ghost" onClick={() => update(periods.active, [], "__all", "")}>Reset filter</Button>}><FilterChips chips={chips} /></FilterBar>
    {!scoped.length ? <Card><EmptyState title="Belum ada record tervalidasi" description="Pilih OPD atau periode lain." /></Card> : <>
      <Card><CardHeader><CardTitle as="h2">Peta hubungan</CardTitle></CardHeader><CardContent className="grid gap-4">
        <p className="text-sm text-muted-foreground">Ringkasan record tervalidasi dan relasi antardomain.</p>
        <DomainMap nodes={scoped} edges={edges} selected={domain === "__all" ? null : domain} securityVisible={data.securityVisible} onSelect={chooseDomain} />
      </CardContent></Card>
      <div id="integration-search" className="scroll-mt-24"><DataTable title="Pilih data untuk melihat keterkaitan" rows={matches} rowId={(n) => n.id} searchText={(n) => `${n.code} ${n.name} ${n.opdName}`} searchPlaceholder="Kode atau nama record" onRowClick={choose} pageSize={10} minWidth={620} resetPageKey={JSON.stringify([period, opds, domain])} columns={[
        { header: "Kode", cell: (n) => n.code }, { header: "Nama", cell: (n) => <span className="font-semibold">{n.name}{selected?.id === n.id && <Badge className="ml-2" variant="secondary">Dipilih</Badge>}</span> },
        { header: "Domain", cell: (n) => domains[n.domain].label }, { header: "OPD", cell: (n) => n.opdName }, { header: "Periode", cell: (n) => n.period },
      ]} /></div>
      <Card id="integration-impact" tabIndex={-1} className="scroll-mt-24"><CardHeader><CardTitle as="h2">Analisis Dampak</CardTitle></CardHeader><CardContent className="grid gap-4">
        <p className="text-sm text-muted-foreground">Simulasi hanya membaca hubungan record tervalidasi dalam filter dan hak akses saat ini. Tidak mengubah atau menghapus data. Hubungan di luar cakupan dapat menambah dampak.</p>
        <Segmented label="Jenis simulasi" value={mode} onChange={setMode} options={[{ value: "change", label: "Perubahan data" }, { value: "delete", label: "Penghapusan data" }]} />
        {!selected ? <EmptyState title="Pilih data untuk melihat dampak" description="Klik baris data di atas. Klik lagi untuk melepas pilihan atau pilih baris lain untuk menggantinya." /> : <>
          <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold">{selected.name}</p><p className="text-xs text-muted-foreground">{selected.code} · {domains[selected.domain].label} · {selected.opdName}</p></div><div className="flex flex-wrap gap-2"><Button variant="ghost" onClick={() => choose(selected)}>Lepas pilihan</Button></div></div>
          <div className="flex flex-wrap gap-2" aria-live="polite"><Badge variant="secondary">{new Set(impacts.map((i) => i.node.domain)).size} domain terkait</Badge><Badge variant="secondary">{impacts.length} record terkait</Badge><Badge variant="secondary">{directEdges.length} relasi langsung</Badge><Badge variant="warning">{impacts.filter((i) => i.certain).length} record dengan tautan pasti terlepas</Badge></div>
          <p className="text-xs text-muted-foreground">Dampak pasti berlaku pada tautan yang terlepas saat penghapusan, bukan penghapusan otomatis record lain. Perubahan isi pada record terkait langsung memerlukan penilaian.</p>
        </>}
      </CardContent></Card>
      {selected && <>
        <Card><CardHeader><CardTitle as="h2">Visualisasi keterkaitan data</CardTitle></CardHeader><CardContent>
          <RecordMap selected={selected} nodes={scoped} edges={directEdges} onSelect={choose} />
        </CardContent></Card>
        <DataTable title="Record terdampak dalam simulasi" rows={impacts} rowId={(r) => r.node.id} searchText={(r) => `${r.node.code} ${r.node.name}`} onRowClick={(r) => setDetail(r.node)} pageSize={10} minWidth={750} resetPageKey={`${selected.id}:${mode}`} columns={[
          { header: "Record", cell: (r) => <span><b>{r.node.name}</b><span className="block text-xs text-muted-foreground">{r.node.code}</span></span> }, { header: "Domain", cell: (r) => domains[r.node.domain].label },
          { header: "Jangkauan", cell: () => "Langsung" }, { header: "Dampak", cell: (r) => <span><Badge variant={r.certain ? "warning" : "secondary"}>{r.certain ? "Pasti pada tautan" : "Potensi"}</Badge><span className="mt-1 block text-xs text-muted-foreground">{r.reason}</span></span> },
        ]} />
        <DataTable title="Hubungan langsung record" rows={directEdges} rowId={(e) => e.id} searchText={(e) => `${byId.get(e.source)?.name} ${byId.get(e.target)?.name} ${e.label}`} pageSize={10} minWidth={650} resetPageKey={selected.id} columns={[
          { header: "Dari", cell: (e) => byId.get(e.source)?.name }, { header: "Ke", cell: (e) => byId.get(e.target)?.name }, { header: "Hubungan", cell: (e) => e.label }, { header: "Bentuk referensi", cell: (e) => storageLabel[e.storage] },
        ]} />
      </>}
    </>}
    {detail && <DetailDialog open title={detail.name} eyebrow={detail.code} onOpenChange={(open) => !open && setDetail(null)}>
      <div className="grid gap-2 sm:grid-cols-2"><DetailField label="Domain" value={domains[detail.domain].label} /><DetailField label="OPD" value={detail.opdName} /><DetailField label="Periode" value={detail.period} /><DetailField label="Kategori" value={detail.category.replaceAll("_", " ")} /></div>
      <p className="text-sm text-muted-foreground">Record tervalidasi. Detail sensitif tidak disertakan dalam peta publik.</p>
      <Button variant="outline" onClick={() => { choose(detail); setDetail(null); }}>Telusuri hubungan record ini</Button>
      <Button asChild><Link href={`${domains[detail.domain].href}?${new URLSearchParams({ periode: detail.period, pd: detail.opd })}`}>Buka dashboard domain</Link></Button>
    </DetailDialog>}
  </Reveal>;
}
