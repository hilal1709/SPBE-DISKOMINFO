"use client";
import { useEffect, useMemo, useState } from "react";
import { chainAction } from "@/app/cms/gap-analysis/actions";
import { DataTable } from "@/components/blocks/data-table";
import { EmptyState } from "@/components/blocks/empty-state";
import { HeatTile } from "@/components/blocks/heat-tile";
import { Segmented } from "@/components/blocks/segmented";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber, percent } from "@/lib/format";
import type { ChainRow } from "@/lib/gap/chain";
import { chainLabel, chainStages, type ChainStage } from "@/lib/gap/rules";
import { unpack } from "@/lib/pack";
import { cn } from "@/lib/utils";

type Show = "putus" | "utuh" | "semua";

/**
 * Analisis gap berantai: tiap proses bisnis tervalidasi ditelusuri ke layanan, data, aplikasi, infrastruktur, dan
 * keamanan yang mendukungnya. Petak tahap menunjukkan berapa probis yang rantainya putus di tahap itu.
 */
export function GapChain({ period, pd }: { period: string; pd: string[] }) {
  const [loaded, setLoaded] = useState<{ period: string; rows: ChainRow[]; error?: string } | null>(null);
  const [stage, setStage] = useState<ChainStage | null>(null);
  const [show, setShow] = useState<Show>("putus");

  useEffect(() => {
    let active = true;
    chainAction(period).then((r) => active && setLoaded(r.ok ? { period, rows: unpack(r.data) } : { period, rows: [], error: r.error }));
    return () => {
      active = false;
    };
  }, [period]);

  const ready = loaded?.period === period ? loaded : null;
  const rows = useMemo(() => (ready?.rows ?? []).filter((r) => !pd.length || pd.includes(r.opd)), [ready, pd]);
  const broken = useMemo(() => new Map(chainStages.map((s) => [s, rows.filter((r) => r.putus === s).length])), [rows]);
  const whole = rows.filter((r) => !r.putus).length;
  const visible = rows.filter((r) => (stage ? r.putus === stage : show === "semua" || (show === "putus" ? !!r.putus : !r.putus)));
  const max = Math.max(1, ...broken.values());

  return (
    <Card data-reveal className="gap-4">
      <CardHeader>
        <CardTitle as="h2" className="section-title">Rantai arsitektur</CardTitle>
        <CardDescription>Proses bisnis → layanan → data → aplikasi → infrastruktur → keamanan, dari entri tervalidasi.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {!ready ? (
          <div className="grid gap-2">
            <Skeleton className="h-20" />
            <Skeleton className="h-40" />
          </div>
        ) : ready.error ? (
          <EmptyState size="sm" illustration="error" title="Rantai belum bisa dimuat" description={ready.error} />
        ) : !rows.length ? (
          <EmptyState size="sm" illustration="filter-empty" title="Belum ada proses bisnis tervalidasi" description="Rantai dihitung dari proses bisnis yang sudah tervalidasi pada periode ini." />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
              {chainStages.map((s) => {
                const n = broken.get(s) ?? 0;
                return (
                  <HeatTile
                    key={s}
                    eyebrow="Putus di"
                    label={chainLabel[s]}
                    value={formatNumber(n)}
                    intensity={n / max}
                    onClick={n ? () => setStage(stage === s ? null : s) : undefined}
                    active={stage === s}
                    dimmed={!!stage && stage !== s}
                    className={cn(!n && "opacity-40")}
                  />
                );
              })}
              <div className="flex min-h-20 flex-col justify-between rounded-xl bg-brand-teal p-3 text-on-brand">
                <span className="text-[11px] leading-snug font-semibold">Rantai utuh</span>
                <span className="text-lg font-bold tabular-nums">
                  {formatNumber(whole)} <span className="text-xs font-medium opacity-80">{percent(whole, rows.length)}%</span>
                </span>
              </div>
            </div>

            <DataTable
              title={stage ? `Putus di ${chainLabel[stage].toLowerCase()}` : show === "putus" ? "Rantai putus" : show === "utuh" ? "Rantai utuh" : "Semua proses bisnis"}
              rows={visible}
              rowId={(r) => r.code}
              searchText={(r) => `${r.code} ${r.name} ${r.opdName}`}
              searchPlaceholder="Cari proses bisnis atau PD"
              resetPageKey={`${stage}:${show}:${pd.join()}`}
              pageSize={10}
              minWidth={860}
              actions={
                !stage && (
                  <Segmented
                    label="Tampilkan rantai"
                    value={show}
                    onChange={setShow}
                    options={[
                      { value: "putus", label: "Putus" },
                      { value: "utuh", label: "Utuh" },
                      { value: "semua", label: "Semua" },
                    ]}
                  />
                )
              }
              columns={[
                {
                  header: "Proses bisnis",
                  sortValue: (r) => r.name,
                  cell: (r) => (
                    <span className="grid gap-0.5">
                      <span className="font-semibold">{r.name}</span>
                      <span className="text-xs text-muted-foreground">{r.opdName}</span>
                    </span>
                  ),
                },
                ...chainStages.map((s) => ({
                  header: chainLabel[s],
                  className: "text-center",
                  sortValue: (r: ChainRow) => r[s],
                  cell: (r: ChainRow) => (r[s] ? <span className="tabular-nums">{formatNumber(r[s])}</span> : <Badge variant={r.putus === s ? "alert" : "muted"}>{r.putus === s ? "Putus" : "—"}</Badge>),
                })),
                { header: "ID", hideable: true, defaultHidden: true, className: "whitespace-nowrap", sortValue: (r) => r.code, cell: (r) => <span className="text-muted-foreground tabular-nums">{r.code}</span> },
              ]}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
