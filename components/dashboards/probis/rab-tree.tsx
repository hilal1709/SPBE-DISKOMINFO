"use client";
import { Fragment, useRef, useState } from "react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/icon";
import { MOTION_OK, gsap, useGSAP } from "@/components/motion/gsap";
import { CountUp } from "@/components/motion/count-up";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RabTreeNode } from "@/lib/probis/query";
import { cn } from "@/lib/utils";

const rabLevels = ["", "Sektor", "Urusan", "Sub-urusan"];

/** Rekap referensi berjenjang (RAB atau RAL) L1 → L2 → L3 dengan expand/collapse. */
export function RabTreeCard({
  tree,
  total,
  className,
  title = "Rekap RAB",
  reference = "RAB",
  levelLabel = rabLevels,
  expandLabel = "Buka sektor",
  defaultExpanded = false,
}: {
  tree: RabTreeNode[];
  total: number;
  className?: string;
  title?: string;
  /** Nama referensi di kepala tabel. */
  reference?: string;
  /** Nama tiap level (indeks = level). */
  levelLabel?: string[];
  expandLabel?: string;
  /** Level 1 langsung terbuka (cocok bila jumlah L1 sedikit, mis. RAL). */
  defaultExpanded?: boolean;
}) {
  const [open, setOpen] = useState<Set<string>>(() => new Set(defaultExpanded ? tree.map((n) => n.code) : []));
  /** Node yang baru dibuka; anak-anaknya dianimasikan masuk. */
  const [opened, setOpened] = useState<string[]>([]);
  const body = useRef<HTMLTableSectionElement>(null);
  const toggle = (code: string) => {
    const opening = !open.has(code);
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
    setOpened(opening ? [code] : []);
  };

  useGSAP(
    () => {
      if (!opened.length) return;
      const rows = opened.flatMap((code) => gsap.utils.toArray<HTMLElement>(`tr[data-parent="${code}"]`, body.current));
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.from(rows, { opacity: 0, x: -12, duration: 0.35, stagger: 0.025, ease: "power2.out", clearProps: "all" });
      });
    },
    { dependencies: [opened], scope: body },
  );
  const allL1 = tree.map((n) => n.code);
  const expanded = allL1.length > 0 && allL1.every((c) => open.has(c));

  const renderRows = (nodes: RabTreeNode[]): React.ReactNode =>
    nodes.map((node) => {
      const isOpen = open.has(node.code);
      const share = total ? (node.count / total) * 100 : 0;
      return (
        <Fragment key={node.code}>
          <tr data-parent={node.parent} className={cn("border-b transition-colors last:border-0 hover:bg-muted/60", node.level === 1 && "bg-muted/40 font-semibold")}>
            <td className="py-2 pr-2" style={{ paddingLeft: `${(node.level - 1) * 1.25 + 0.5}rem` }}>
              <div className="flex items-start gap-1.5">
                {node.children.length ? (
                  <Button variant="ghost" size="icon-xs" aria-expanded={isOpen} aria-label={`${isOpen ? "Tutup" : "Buka"} ${node.name}`} onClick={() => toggle(node.code)} className="-mt-0.5 shrink-0">
                    <Icon icon={ArrowRight01Icon} size={14} className={cn("transition-transform duration-200", isOpen && "rotate-90")} />
                  </Button>
                ) : (
                  <span className="w-6 shrink-0" />
                )}
                <div className="min-w-0">
                  <span className="mr-1.5 text-[11px] font-medium whitespace-nowrap text-muted-foreground tabular-nums">{node.code}</span>
                  <span className={cn("text-xs", node.level > 1 && "font-normal")}>{node.name}</span>
                </div>
              </div>
            </td>
            <td className="hidden py-2 pr-3 text-[11px] text-muted-foreground sm:table-cell">{levelLabel[node.level]}</td>
            <td className="w-28 py-2 pr-3">
              <div className="flex items-center justify-end gap-2">
                <span className="h-1.5 w-12 overflow-hidden rounded-full bg-muted" aria-hidden>
                  <span className="block h-full rounded-full bg-brand-teal transition-[width] duration-700 ease-(--ease-out)" style={{ width: `${Math.max(share, 2)}%` }} />
                </span>
                <b className="w-10 text-right text-xs tabular-nums"><CountUp instant value={node.count} /></b>
              </div>
            </td>
          </tr>
          {isOpen && renderRows(node.children)}
        </Fragment>
      );
    });

  return (
    <Card data-reveal className={cn("gap-3", className)}>
      <CardHeader>
        <CardTitle className="section-title">{title}</CardTitle>
        <CardAction>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setOpen(expanded ? new Set() : new Set(allL1));
              setOpened(expanded ? [] : allL1);
            }}
          >
            {expanded ? "Tutup semua" : expandLabel}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="max-h-96 overflow-y-auto px-3">
        <table className="w-full text-left">
          <thead className="sticky top-0 z-10 bg-card text-[11px] tracking-wide text-muted-foreground uppercase">
            <tr className="border-b">
              <th className="py-2 pl-2 font-semibold">Kode & nama {reference}</th>
              <th className="hidden py-2 font-semibold sm:table-cell">Level</th>
              <th className="py-2 pr-3 text-right font-semibold">Jumlah</th>
            </tr>
          </thead>
          <tbody>{renderRows(tree)}</tbody>
        </table>
      </CardContent>
    </Card>
  );
}
