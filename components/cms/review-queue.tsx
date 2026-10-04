"use client";
import { useRef, useState } from "react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { EmptyState } from "@/components/blocks/empty-state";
import { ReviewBadge } from "@/components/cms/review-badge";
import { ProbisDetail } from "@/components/cms/probis-detail";
import { Icon } from "@/components/icon";
import { MOTION_OK, gsap, useGSAP } from "@/components/motion/gsap";
import { Reveal } from "@/components/motion/reveal";
import { Card } from "@/components/ui/card";
import type { Actor, ReviewStage } from "@/lib/permissions";
import { useRabSet } from "@/components/probis/rab-context";
import type { ProbisRecord } from "@/lib/types";

const date = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" });

const copy: Record<ReviewStage, { empty: string; waiting: string }> = {
  verifikasi: { empty: "Tidak ada ajuan OPD yang menunggu verifikasi.", waiting: "ajuan OPD menunggu verifikasi tim Bagian Organisasi." },
  validasi: { empty: "Tidak ada probis terverifikasi yang menunggu validasi.", waiting: "probis terverifikasi menunggu validasi akhir tim Diskominfo." },
};

/** Antrean satu tahap pemeriksaan: verifikasi (Bagian Organisasi) atau validasi (Diskominfo). */
export function ReviewQueue({ rows, actor, stage }: { rows: ProbisRecord[]; actor: Actor; stage: ReviewStage }) {
  const [selected, setSelected] = useState<ProbisRecord | null>(null);
  const rabs = useRabSet();
  const list = useRef<HTMLUListElement>(null);

  useGSAP(
    () => {
      gsap.matchMedia().add(MOTION_OK, () => {
        gsap.from("li", { opacity: 0, y: 12, stagger: 0.05, duration: 0.4, ease: "power3.out", clearProps: "all" });
      });
    },
    { dependencies: [rows.length], scope: list },
  );

  if (!rows.length) {
    return (
      <Card>
        <EmptyState illustration="success" title="Antrean bersih" description={copy[stage].empty} />
      </Card>
    );
  }

  return (
    <Reveal className="grid gap-4">
      <p data-reveal className="text-sm text-muted-foreground">
        <b className="text-foreground tabular-nums">{rows.length}</b> {copy[stage].waiting}
      </p>
      <ul ref={list} className="grid gap-2">
        {rows.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => setSelected(r)}
              className="group/q flex w-full items-center gap-4 rounded-xl bg-card p-4 text-left shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-raised focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none"
            >
              <ReviewBadge status={r.status} />
              <span className="grid min-w-0 flex-1 gap-0.5">
                <span className="truncate font-semibold">{r.name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {r.opdName} · {r.rab3 ? rabs.forPeriod(r.period).label(r.rab3) : "RAB belum diisi"}
                </span>
              </span>
              <span className="hidden text-xs text-muted-foreground sm:block">{date.format(new Date(r.updatedAt))}</span>
              <Icon icon={ArrowRight01Icon} size={16} className="text-muted-foreground transition-transform duration-200 group-hover/q:translate-x-1" />
            </button>
          </li>
        ))}
      </ul>
      {selected && <ProbisDetail record={selected} actor={actor} onClose={() => setSelected(null)} />}
    </Reveal>
  );
}
