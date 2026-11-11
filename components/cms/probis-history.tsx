"use client";
import { useEffect, useState } from "react";
import { getProbisHistory } from "@/app/cms/actions";
import { DetailSection } from "@/components/blocks/detail-dialog";
import { ReviewBadge } from "@/components/cms/review-badge";
import { Badge } from "@/components/ui/badge";
import type { ProbisHistoryItem } from "@/lib/probis/repo";

/** Probis yang sama di periode lain (kode sama): namanya menjadi history ketika periode berganti. */
export function ProbisHistory({ id }: { id: string }) {
  const [items, setItems] = useState<ProbisHistoryItem[] | null>(null);
  useEffect(() => {
    let active = true;
    getProbisHistory(id).then((r) => active && setItems(r.ok ? r.data : []));
    return () => {
      active = false;
    };
  }, [id]);

  // Hanya satu periode: tidak ada riwayat untuk ditampilkan.
  if (!items || items.length < 2) return null;
  return (
    <DetailSection title="Riwayat antarperiode">
      <ol className="relative grid gap-3 border-l pl-4">
        {items.map((item) => (
          <li key={item.id} className="relative text-sm">
            <span aria-hidden className={`absolute top-1.5 -left-[1.3rem] size-2.5 rounded-full border-2 border-card ${item.id === id ? "bg-brand-teal" : "bg-muted-foreground"}`} />
            <p className="flex flex-wrap items-center gap-2">
              <span className="font-semibold tabular-nums">{item.period}</span>
              <ReviewBadge status={item.status} />
              {item.hasDiagram && <Badge variant="muted">Diagram</Badge>}
            </p>
            <p className="mt-0.5">{item.name}</p>
            <p className="text-xs text-muted-foreground">{item.opdName}</p>
          </li>
        ))}
      </ol>
    </DetailSection>
  );
}
