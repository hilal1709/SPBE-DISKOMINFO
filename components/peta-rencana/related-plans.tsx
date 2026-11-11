"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { relatedRencana } from "@/app/cms/peta-rencana/actions";
import { DetailSection } from "@/components/blocks/detail-dialog";
import { RencanaStatus } from "@/components/peta-rencana/rencana-body";
import type { DomainKey } from "@/lib/domains";
import type { RelatedPlan } from "@/lib/peta-rencana/links";
import type { Rencana } from "@/lib/types";

/** Kegiatan Peta Rencana yang menunjuk entri arsitektur ini (arah sebaliknya dari tautan di formulir kegiatan). */
export function RelatedPlans({ domain, code, period }: { domain: DomainKey; code: string; period: string }) {
  const [plans, setPlans] = useState<RelatedPlan[]>([]);
  useEffect(() => {
    let active = true;
    relatedRencana(domain, code, period).then((r) => active && setPlans(r.ok ? r.data : []));
    return () => {
      active = false;
    };
  }, [domain, code, period]);

  if (!plans.length) return null;
  return (
    <DetailSection title="Peta Rencana terkait">
      <ul className="grid gap-2">
        {plans.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold tabular-nums">{p.year}</span>
            <Link href={`/cms/peta-rencana/${p.id}`} className="min-w-0 flex-1 underline-offset-4 hover:underline">{p.name}</Link>
            <RencanaStatus status={p.status as Rencana["status"]} />
          </li>
        ))}
      </ul>
    </DetailSection>
  );
}
