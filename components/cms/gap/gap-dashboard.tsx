"use client";
import { useEffect, useMemo, useState } from "react";
import { Download04Icon } from "@hugeicons/core-free-icons";
import { chainAction, chainDetailAction } from "@/app/cms/gap-analysis/actions";
import { DataTable } from "@/components/blocks/data-table";
import { DetailDialog, DetailSection } from "@/components/blocks/detail-dialog";
import { EmptyState } from "@/components/blocks/empty-state";
import { FilterBar } from "@/components/blocks/filter-bar";
import { HeatTile } from "@/components/blocks/heat-tile";
import { Segmented } from "@/components/blocks/segmented";
import { Icon } from "@/components/icon";
import { Reveal } from "@/components/motion/reveal";
import { useOpd } from "@/components/opd/opd-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber, percent } from "@/lib/format";
import type { ChainDetail, ChainRow } from "@/lib/gap/chain";
import { chainLabel, chainStages, type ChainStage } from "@/lib/gap/rules";
import { unpack, type Packed } from "@/lib/pack";
import { type PeriodOptions } from "@/lib/probis/reference";
import { cn } from "@/lib/utils";

type Show = "kurang" | "lengkap" | "semua";
type Loaded = { period: string; rows: ChainRow[]; error?: string };

/** Jumlah domain yang sudah dimiliki probis. */
const filled = (r: ChainRow) => chainStages.filter((s) => r[s]).length;

/**
 * Gap Analysis: tiap proses bisnis tervalidasi diperiksa apakah sudah punya layanan, data, aplikasi, infrastruktur,
 * dan keamanan tervalidasi (langsung atau lewat rantai). Domain yang belum ada adalah kesenjangannya.
 */
export function GapDashboard({ initial, periods, canExport }: { initial: { period: string; data: Packed<ChainRow> }; periods: PeriodOptions; canExport: boolean }) {
  const opd = useOpd();
  const [period, setPeriod] = useState(initial.period);
  const [pd, setPd] = useState<string[]>([]);
  const [focus, setFocus] = useState<ChainStage | null>(null);
  const [show, setShow] = useState<Show>("kurang");
  const [selected, setSelected] = useState<ChainRow | null>(null);
  const [loaded, setLoaded] = useState<Loaded>(() => ({ period: initial.period, rows: unpack(initial.data) }));

  useEffect(() => {
    if (loaded.period === period) return;
    let active = true;
    chainAction(period).then((r) => active && setLoaded(r.ok ? { period, rows: unpack(r.data) } : { period, rows: [], error: r.error }));
    return () => {
      active = false;
    };
  }, [period, loaded.period]);

  const ready = loaded.period === period ? loaded : null;
  const rows = useMemo(() => (ready?.rows ?? []).filter((r) => !pd.length || pd.includes(r.opd)), [ready, pd]);
  const lacking = useMemo(() => new Map(chainStages.map((s) => [s, rows.filter((r) => !r[s]).length])), [rows]);
  const complete = rows.filter((r) => filled(r) === chainStages.length).length;
  const visible = rows.filter((r) => (focus ? !r[focus] : show === "semua" || (show === "lengkap") === (filled(r) === chainStages.length)));

  return (
    <Reveal className="grid gap-5">
      <FilterBar
        filters={[
          { label: "Periode", required: true, options: periods.periods, value: period, onChange: (v) => (setPeriod(v), setFocus(null)) },
          { label: "Perangkat Daerah", wide: true, multiple: true, searchable: true, options: opd.all(period).map((p) => ({ value: p.code, label: p.name })), values: pd, onValuesChange: setPd },
        ]}
        actions={
          canExport && (
            <Button asChild variant="outline">
              <a href={`/api/export/gap?period=${encodeURIComponent(period)}`}>
                <Icon icon={Download04Icon} size={16} />
                Ekspor
              </a>
            </Button>
          )
        }
      />

      {!ready ? (
        <div className="grid gap-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-96" />
        </div>
      ) : ready.error ? (
        <Card>
          <EmptyState illustration="error" title="Data belum bisa dimuat" description={ready.error} />
        </Card>
      ) : !rows.length ? (
        <Card>
          <EmptyState illustration="gap-bridge" title="Belum ada proses bisnis tervalidasi" description="Kelengkapan dihitung dari proses bisnis yang sudah tervalidasi pada periode ini." />
        </Card>
      ) : (
        <>
          <Card data-reveal className="gap-4">
            <CardHeader>
              <CardTitle as="h2" className="section-title">Kelengkapan proses bisnis</CardTitle>
              <CardDescription>Jumlah proses bisnis yang belum memiliki tiap domain. Pilih petak untuk menyaring.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
              {chainStages.map((s) => {
                const n = lacking.get(s) ?? 0;
                return (
                  <HeatTile
                    key={s}
                    eyebrow="Belum ada"
                    label={chainLabel[s]}
                    value={`${formatNumber(n)} · ${percent(n, rows.length)}%`}
                    intensity={n / rows.length}
                    onClick={n ? () => setFocus(focus === s ? null : s) : undefined}
                    active={focus === s}
                    dimmed={!!focus && focus !== s}
                    className={cn(!n && "opacity-40")}
                  />
                );
              })}
              <div className="flex min-h-20 flex-col justify-between rounded-xl bg-brand-teal p-3 text-on-brand">
                <span className="text-[11px] leading-snug font-semibold">Lengkap 5 domain</span>
                <span className="text-lg font-bold tabular-nums">
                  {formatNumber(complete)} <span className="text-xs font-medium opacity-80">{percent(complete, rows.length)}%</span>
                </span>
              </div>
            </CardContent>
          </Card>

          <DataTable
            title={focus ? `Belum ada ${chainLabel[focus].toLowerCase()}` : show === "kurang" ? "Belum lengkap" : show === "lengkap" ? "Sudah lengkap" : "Semua proses bisnis"}
            rows={visible}
            rowId={(r) => r.code}
            searchText={(r) => `${r.code} ${r.name} ${r.opdName}`}
            searchPlaceholder="Cari proses bisnis atau PD"
            resetPageKey={`${period}:${focus}:${show}:${pd.join()}`}
            onRowClick={setSelected}
            pageSize={20}
            minWidth={900}
            actions={
              focus ? (
                <Button variant="outline" onClick={() => setFocus(null)}>
                  Tampilkan semua
                </Button>
              ) : (
                <Segmented
                  label="Tampilkan"
                  value={show}
                  onChange={setShow}
                  options={[
                    { value: "kurang", label: "Belum lengkap" },
                    { value: "lengkap", label: "Lengkap" },
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
                sortValue: (r: ChainRow) => (r[s] ? 1 : 0),
                cell: (r: ChainRow) => <Presence ok={!!r[s]} />,
              })),
              {
                header: "Kelengkapan",
                sortValue: (r) => filled(r),
                cell: (r) => <Completeness value={filled(r)} />,
              },
              { header: "ID", hideable: true, defaultHidden: true, className: "whitespace-nowrap", sortValue: (r) => r.code, cell: (r) => <span className="text-muted-foreground tabular-nums">{r.code}</span> },
            ]}
          />
        </>
      )}

      {selected && <ChainDetailDialog period={period} row={selected} onClose={() => setSelected(null)} />}
    </Reveal>
  );
}

function Presence({ ok }: { ok: boolean }) {
  return <Badge variant={ok ? "success" : "alert"}>{ok ? "Ada" : "Belum"}</Badge>;
}

function Completeness({ value }: { value: number }) {
  const total = chainStages.length;
  return (
    <span className="flex items-center gap-2">
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-muted" aria-hidden>
        <span className={cn("block h-full rounded-full", value === total ? "bg-brand-teal" : value >= 3 ? "bg-brand-yellow" : "bg-brand-orange")} style={{ width: `${(value / total) * 100}%` }} />
      </span>
      <span className="text-xs tabular-nums text-muted-foreground">
        {value}/{total}
      </span>
    </span>
  );
}

function ChainDetailDialog({ period, row, onClose }: { period: string; row: ChainRow; onClose: () => void }) {
  const [detail, setDetail] = useState<{ data?: ChainDetail; error?: string } | null>(null);

  useEffect(() => {
    let active = true;
    chainDetailAction(period, row.code).then((r) => active && setDetail(r.ok ? { data: r.data } : { error: r.error }));
    return () => {
      active = false;
    };
  }, [period, row.code]);

  return (
    <DetailDialog open onOpenChange={(open) => !open && onClose()} eyebrow={row.opdName} title={row.name} meta={<Completeness value={filled(row)} />}>
      {!detail ? (
        <div className="grid gap-3">
          {chainStages.map((s) => (
            <Skeleton key={s} className="h-16" />
          ))}
        </div>
      ) : detail.error ? (
        <EmptyState size="sm" illustration="error" title="Detail belum bisa dimuat" description={detail.error} />
      ) : (
        chainStages.map((s) => {
          const items = detail.data?.[s] ?? [];
          return (
            <DetailSection key={s} title={`${chainLabel[s]} · ${items.length ? formatNumber(items.length) : "belum ada"}`}>
              {items.length ? (
                <ul className="grid gap-1 text-sm">
                  {items.map((it) => (
                    <li key={it.code} className="flex gap-2">
                      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{it.code}</span>
                      <span>{it.name}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <Presence ok={false} />
              )}
            </DetailSection>
          );
        })
      )}
    </DetailDialog>
  );
}
