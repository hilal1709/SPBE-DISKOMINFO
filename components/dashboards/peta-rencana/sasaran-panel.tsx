"use client";
import { useRef, useState } from "react";
import { FilterAddIcon } from "@hugeicons/core-free-icons";
import { DetailDialog, DetailSection } from "@/components/blocks/detail-dialog";
import { ToneBadge } from "@/components/blocks/status-badge";
import { Icon } from "@/components/icon";
import { MOTION_OK, gsap, useGSAP } from "@/components/motion/gsap";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { muatanConfig, muatanKeys, statusConfig, statusKeys } from "@/lib/peta-rencana/muatan";
import type { Rencana, RencanaIndicator } from "@/lib/types";
import { cn } from "@/lib/utils";

const fmt = new Intl.NumberFormat("id-ID");

/** Batang bertumpuk per status pelaksanaan (warna sama dengan grafik status per tahun); panjangnya relatif ke sasaran terbanyak. */
function StatusBar({ list, width }: { list: Rencana[]; width: number }) {
  const bar = useRef<HTMLSpanElement>(null);
  useGSAP(() => {
    gsap.matchMedia().add(MOTION_OK, () => {
      gsap.from(bar.current, { scaleX: 0, duration: 1.1, ease: "power3.out", scrollTrigger: { trigger: bar.current, start: "top 98%", once: true } });
    });
  });
  const parts = statusKeys.map((k) => [k, list.filter((r) => r.status === k).length] as const).filter(([, n]) => n > 0);
  return (
    <span className="block h-2 overflow-hidden rounded-full bg-muted" role="img" aria-label={parts.map(([k, n]) => `${statusConfig[k].label} ${n}`).join(", ")}>
      <span ref={bar} className="flex h-full origin-left gap-px" style={{ width: `${width}%` }}>
        {parts.map(([k, n]) => (
          <span key={k} className="h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${(n / list.length) * 100}%`, background: `var(${statusConfig[k].tone})` }} />
        ))}
      </span>
    </span>
  );
}

/**
 * Sasaran strategis peta rencana: jumlah kegiatan & progres terlaksana per sasaran. Klik sasaran membuka pop-up
 * inisiatif, indikator, dan target tiap tahun (menggantikan dua tabel indikator referensi Gresik).
 */
export function SasaranPanel({ rows, indicators, years, selected, onFilter, className }: { rows: Rencana[]; indicators: RencanaIndicator[]; years: string[]; selected: string[]; onFilter: (sasaran: string) => void; className?: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const bySasaran = new Map<string, Rencana[]>();
  for (const r of rows) bySasaran.set(r.sasaran, [...(bySasaran.get(r.sasaran) ?? []), r]);
  const groups = [...bySasaran].map(([sasaran, list]) => ({ sasaran, list, done: list.filter((r) => r.status === "terlaksana").length })).sort((a, b) => b.list.length - a.list.length);
  const max = groups[0]?.list.length ?? 1;
  const detail = open ? groups.find((g) => g.sasaran === open) : null;
  const targets = open ? indicators.filter((i) => i.sasaran === open) : [];

  return (
    <Card className={cn("gap-3", className)}>
      <CardHeader>
        <CardTitle className="section-title">Sasaran strategis</CardTitle>
      </CardHeader>
      <CardContent className="grid max-h-[30rem] content-start gap-1 overflow-y-auto">
        {groups.map((g) => (
          <button
            key={g.sasaran}
            type="button"
            onClick={() => setOpen(g.sasaran)}
            className={cn("grid gap-1.5 rounded-xl px-3 py-2 text-left transition-colors hover:bg-accent", selected.includes(g.sasaran) && "bg-accent ring-1 ring-brand-teal")}
          >
            <span className="flex items-baseline justify-between gap-3 text-sm">
              <span className="line-clamp-2 font-medium">{g.sasaran}</span>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{fmt.format(g.list.length)}</span>
            </span>
            <StatusBar list={g.list} width={(g.list.length / max) * 100} />
          </button>
        ))}
      </CardContent>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 px-6 text-xs text-muted-foreground" aria-label="Keterangan warna status">
        {statusKeys.map((k) => (
          <li key={k} className="flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-full" style={{ background: `var(${statusConfig[k].tone})` }} />
            {statusConfig[k].label}
          </li>
        ))}
      </ul>

      {detail && (
        <DetailDialog
          open
          onOpenChange={(o) => !o && setOpen(null)}
          eyebrow="Sasaran strategis"
          title={detail.sasaran}
          meta={<span className="text-sm text-muted-foreground">{fmt.format(detail.list.length)} kegiatan · {Math.round((detail.done / (detail.list.length || 1)) * 100)}% terlaksana</span>}
        >
          <div className="flex flex-wrap gap-2">
            {muatanKeys.map((k) => {
              const n = detail.list.filter((r) => r.muatan === k).length;
              return n ? <ToneBadge key={k} tone={muatanConfig[k].tone}>{muatanConfig[k].label} · {n}</ToneBadge> : null;
            })}
          </div>
          {[...new Set(detail.list.map((r) => r.inisiatif).filter(Boolean))].length > 0 && (
            <DetailSection title="Inisiatif strategis">
              <ul className="grid gap-1 text-sm">
                {[...new Set(detail.list.map((r) => r.inisiatif).filter(Boolean))].map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </DetailSection>
          )}
          <DetailSection title="Indikator & target" tone="accent">
            {targets.length ? (
              <div className="-mx-1 overflow-x-auto">
                <table className="w-full min-w-[28rem] text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="px-1 py-1 font-medium">Indikator</th>
                      {years.map((y) => (
                        <th key={y} className="px-1 py-1 text-right font-medium tabular-nums">{y}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {targets.map((t) => (
                      <tr key={t.id} className="border-t border-brand-sky/60">
                        <td className="px-1 py-1.5 font-medium">{t.indikator}</td>
                        {years.map((y) => (
                          <td key={y} className="px-1 py-1.5 text-right whitespace-nowrap tabular-nums">{t.targets[y] ?? "—"}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Belum ada indikator untuk sasaran ini.</p>
            )}
          </DetailSection>
          <Button variant="outline" className="justify-self-start" onClick={() => (onFilter(detail.sasaran), setOpen(null))}>
            <Icon icon={FilterAddIcon} size={16} />
            {selected.includes(detail.sasaran) ? "Lepas filter sasaran ini" : "Filter sasaran ini"}
          </Button>
        </DetailDialog>
      )}
    </Card>
  );
}
