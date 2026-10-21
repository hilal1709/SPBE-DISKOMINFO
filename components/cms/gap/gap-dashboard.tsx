"use client";
import { useMemo, useState, useTransition } from "react";
import { Add01Icon, Download04Icon, RadarIcon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { scanGapAction } from "@/app/cms/gap-analysis/actions";
import { DataTable } from "@/components/blocks/data-table";
import { EmptyState } from "@/components/blocks/empty-state";
import { FilterBar } from "@/components/blocks/filter-bar";
import { HeatTile } from "@/components/blocks/heat-tile";
import { StatCard } from "@/components/blocks/stat-card";
import { StatRow } from "@/components/blocks/stat-row";
import { ToneBadge } from "@/components/blocks/status-badge";
import { GapDetail, GapPriority, GapStatus } from "@/components/cms/gap/gap-detail";
import { GapForm } from "@/components/cms/gap/gap-form";
import { GapFunnel } from "@/components/cms/gap/gap-funnel";
import { StatusTabs } from "@/components/cms/status-tabs";
import { Icon } from "@/components/icon";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { gapStatusConfig, gapStatusKeys, priorityConfig, priorityKeys, ruleConfig, type GapRule, type GapStatus as Status } from "@/lib/gap/rules";
import { muatanConfig, muatanKeys, muatanOptions } from "@/lib/peta-rencana/muatan";
import { perangkatDaerah, type PeriodOptions } from "@/lib/probis/reference";
import { unpack, type Packed } from "@/lib/pack";
import type { GapRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

const fmt = new Intl.NumberFormat("id-ID");

type Tab = "all" | Status;
const tabs: { value: Tab; label: string }[] = [{ value: "all", label: "Semua" }, ...gapStatusKeys.map((k) => ({ value: k, label: gapStatusConfig[k].label }))];

/**
 * Gap Analysis: AS-IS (data tervalidasi semua domain) dibandingkan target arsitektur. Temuan dipindai otomatis dari
 * relasi antardomain atau ditambah manual, lalu diusulkan menjadi kegiatan Peta Rencana (notulen 1 Juli 2026).
 */
export function GapDashboard({ data, periods, canManage, canExport }: { data: Packed<GapRecord>; periods: PeriodOptions; canManage: boolean; canExport: boolean }) {
  // Ribuan temuan dikemas ringkas dari server; statistik dashboard tetap dihitung dari semua baris.
  const rows = useMemo(() => unpack(data), [data]);
  const [period, setPeriod] = useState(periods.active);
  const [domain, setDomain] = useState<string[]>([]);
  const [priority, setPriority] = useState<string[]>([]);
  const [pd, setPd] = useState<string[]>([]);
  const [tab, setTab] = useState<Tab>("terbuka");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<GapRecord | "new" | null>(null);
  const [scanning, startScan] = useTransition();
  const selected = rows.find((r) => r.id === selectedId) ?? null;

  const inPeriod = useMemo(() => rows.filter((r) => r.period === period), [rows, period]);
  const scoped = useMemo(
    () => inPeriod.filter((r) => (!domain.length || domain.includes(r.domain)) && (!priority.length || priority.includes(r.priority)) && (!pd.length || pd.includes(perangkatDaerah.find((p) => p.name === r.opdName)?.code ?? ""))),
    [inPeriod, domain, priority, pd],
  );
  const counts = useMemo(() => {
    const map = new Map<string, number>([["all", scoped.length]]);
    for (const r of scoped) map.set(r.status, (map.get(r.status) ?? 0) + 1);
    return map;
  }, [scoped]);
  const visible = tab === "all" ? scoped : scoped.filter((r) => r.status === tab);
  const open = scoped.filter((r) => r.status === "terbuka");

  // Matriks domain × prioritas dari temuan terbuka (tanpa filter domain/prioritas agar tetap bisa dipakai memilih).
  const openForMatrix = inPeriod.filter((r) => r.status === "terbuka" && (!pd.length || pd.includes(perangkatDaerah.find((p) => p.name === r.opdName)?.code ?? "")));
  const domains = muatanKeys.filter((k) => openForMatrix.some((r) => r.domain === k));
  const cell = (d: string, p: string) => openForMatrix.filter((r) => r.domain === d && r.priority === p).length;
  const maxCell = Math.max(1, ...domains.flatMap((d) => priorityKeys.map((p) => cell(d, p))));
  const pickCell = (d: string, p: string) => {
    const on = domain.length === 1 && domain[0] === d && priority.length === 1 && priority[0] === p;
    setDomain(on ? [] : [d]);
    setPriority(on ? [] : [p]);
    setTab("terbuka");
  };

  const scan = () =>
    startScan(async () => {
      const request = scanGapAction(period);
      toast.promise(request.then((r) => (r.ok ? r : Promise.reject(new Error(r.error)))), {
        loading: "Memindai kesenjangan semua domain…",
        success: (r) => ({ message: `${fmt.format(r.data.created)} temuan baru`, description: `${fmt.format(r.data.total)} kesenjangan terdeteksi · ${fmt.format(r.data.closed)} tertutup otomatis` }),
        error: (e: Error) => e.message,
      });
      await request;
    });

  const actions = (
    <div className="flex flex-wrap gap-2">
      {canManage && (
        <>
          <Button variant="teal" loading={scanning} onClick={scan}>
            {!scanning && <Icon icon={RadarIcon} size={16} />}
            Pindai kesenjangan
          </Button>
          <Button variant="outline" onClick={() => setEditing("new")}>
            <Icon icon={Add01Icon} size={16} />
            Temuan manual
          </Button>
        </>
      )}
      {canExport && (
        <Button asChild variant="outline">
          <a href="/api/export/gap">
            <Icon icon={Download04Icon} size={16} />
            Ekspor
          </a>
        </Button>
      )}
    </div>
  );

  return (
    <Reveal className="grid gap-5">
      <FilterBar
        filters={[
          { label: "Periode", required: true, options: periods.periods, value: period, onChange: setPeriod },
          { label: "Domain", multiple: true, options: muatanOptions, values: domain, onValuesChange: setDomain },
          { label: "Prioritas", multiple: true, options: priorityKeys.map((k) => ({ value: k, label: priorityConfig[k].label })), values: priority, onValuesChange: setPriority },
          { label: "Perangkat Daerah", wide: true, multiple: true, searchable: true, options: perangkatDaerah.map((p) => ({ value: p.code, label: p.name })), values: pd, onValuesChange: setPd },
        ]}
        actions={actions}
      />

      {inPeriod.length === 0 ? (
        <Card data-reveal>
          <EmptyState illustration="gap-bridge" title="Belum ada temuan di periode ini" description="Pindai kesenjangan untuk membandingkan data tervalidasi tiap domain dengan target arsitektur, atau tambah temuan manual.">
            {canManage && (
              <Button variant="teal" loading={scanning} onClick={scan}>
                {!scanning && <Icon icon={RadarIcon} size={16} />}
                Pindai sekarang
              </Button>
            )}
          </EmptyState>
        </Card>
      ) : (
        <>
          <StatRow>
            <StatCard tone="orange" label="Kesenjangan terbuka" value={open.length} hint={`${new Set(open.map((r) => r.domain)).size} domain`} />
            <StatCard tone="amber" label="Prioritas tinggi" value={open.filter((r) => r.priority === "tinggi").length} hint="belum ditindaklanjuti" />
            <StatCard tone="yellow" label="Diusulkan" value={counts.get("diusulkan") ?? 0} hint="menjadi kegiatan Peta Rencana" />
            <StatCard tone="teal" label="Ditindaklanjuti" value={counts.get("ditindaklanjuti") ?? 0} hint="target terpenuhi" />
            <StatCard tone="sky" label="Diabaikan" value={counts.get("diabaikan") ?? 0} />
          </StatRow>

          <section className="grid gap-5 *:min-w-0 xl:grid-cols-[1.4fr_1fr]">
            <div data-aos="fade-blur" suppressHydrationWarning>
              <Card className="h-full gap-3">
                <CardHeader>
                  <CardTitle className="section-title">Peta kesenjangan terbuka</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  {domains.length ? (
                    <div className="grid min-w-[22rem] grid-cols-[7rem_repeat(3,minmax(0,1fr))] gap-2 text-xs">
                      <span />
                      {priorityKeys.map((p) => (
                        <span key={p} className="text-center font-medium text-muted-foreground">{priorityConfig[p].label}</span>
                      ))}
                      {domains.map((d) => (
                        <div key={d} className="contents">
                          <span className="flex items-center font-medium">{muatanConfig[d].label}</span>
                          {priorityKeys.map((p) => {
                            const n = cell(d, p);
                            const on = domain.includes(d) && priority.includes(p);
                            return (
                              <HeatTile
                                key={p}
                                label={`${muatanConfig[d].label} · ${priorityConfig[p].label}`}
                                value={fmt.format(n)}
                                intensity={n / maxCell}
                                onClick={n ? () => pickCell(d, p) : undefined}
                                active={on}
                                dimmed={(domain.length > 0 || priority.length > 0) && !on}
                                className={cn("min-h-14 [&>span:first-child]:sr-only", !n && "opacity-40")}
                              />
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState size="sm" illustration="success" title="Tidak ada kesenjangan terbuka" description="Semua temuan sudah diusulkan, ditindaklanjuti, atau diabaikan." />
                  )}
                </CardContent>
              </Card>
            </div>
            <GapFunnel found={scoped.filter((r) => r.status !== "diabaikan").length} proposed={(counts.get("diusulkan") ?? 0) + (counts.get("ditindaklanjuti") ?? 0)} done={counts.get("ditindaklanjuti") ?? 0} />
          </section>

          <StatusTabs value={tab} onChange={setTab} counts={counts} tabs={tabs} />
          <DataTable
            title={tab === "all" ? "Semua temuan" : `Temuan ${gapStatusConfig[tab].label.toLowerCase()}`}
            rows={visible}
            rowId={(r) => r.id}
            searchText={(r) => `${r.code} ${r.subjectCode ?? ""} ${r.subjectName} ${r.opdName ?? ""} ${r.rekomendasi}`}
            searchPlaceholder="Cari objek, rekomendasi, PD, atau ID"
            onRowClick={(r) => setSelectedId(r.id)}
            pageSize={20}
            minWidth={820}
            columns={[
              { header: "Prioritas", sortValue: (r) => priorityKeys.indexOf(r.priority), cell: (r) => <GapPriority priority={r.priority} /> },
              {
                header: "Temuan",
                sortValue: (r) => r.subjectName,
                cell: (r) => (
                  <span className="grid gap-0.5">
                    <span className="font-semibold">{r.subjectName}</span>
                    <span className="text-xs text-muted-foreground">{r.rule ? ruleConfig[r.rule as GapRule]?.label : "Temuan manual"}</span>
                  </span>
                ),
              },
              { header: "Domain", sortValue: (r) => r.domain, cell: (r) => <ToneBadge tone={muatanConfig[r.domain].tone}>{muatanConfig[r.domain].label}</ToneBadge> },
              { header: "Perangkat Daerah", hideable: true, sortValue: (r) => r.opdName ?? "", cell: (r) => r.opdName ?? "—" },
              { header: "Status", hideable: true, defaultHidden: true, sortValue: (r) => r.status, cell: (r) => <GapStatus status={r.status} /> },
              { header: "AS-IS", hideable: true, defaultHidden: true, cell: (r) => <span className="line-clamp-2">{r.asIs}</span> },
              { header: "Rekomendasi", hideable: true, defaultHidden: true, cell: (r) => <span className="line-clamp-2">{r.rekomendasi}</span> },
              { header: "ID", hideable: true, defaultHidden: true, className: "whitespace-nowrap", sortValue: (r) => r.code, cell: (r) => <span className="text-muted-foreground tabular-nums">{r.code}</span> },
            ]}
          />
        </>
      )}

      {selected && <GapDetail gap={selected} canManage={canManage} onEdit={() => (setEditing(selected), setSelectedId(null))} onClose={() => setSelectedId(null)} />}
      {editing && <GapForm gap={editing === "new" ? null : editing} period={period} periods={periods.periods} onClose={() => setEditing(null)} />}
    </Reveal>
  );
}
