"use client";
import { useRef, useState } from "react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { EmptyState } from "@/components/blocks/empty-state";
import { ProbisDetail } from "@/components/cms/probis-detail";
import { ReviewBadge } from "@/components/cms/review-badge";
import { Icon } from "@/components/icon";
import { MOTION_OK, gsap, useGSAP } from "@/components/motion/gsap";
import { Reveal } from "@/components/motion/reveal";
import { useRabSet } from "@/components/probis/rab-context";
import { Card } from "@/components/ui/card";
import type { Actor, ReviewStage } from "@/lib/permissions";
import type { ProbisRecord, SubmissionStatus } from "@/lib/types";

const date = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" });

type QueueItem = { id: string; name: string; status: SubmissionStatus; opdName: string; updatedAt: string };

/** Teks antrean per tahap; `noun` = "probis" / "layanan". */
const copy = (stage: ReviewStage, noun: string) =>
  stage === "verifikasi"
    ? { empty: `Tidak ada ajuan ${noun} OPD yang menunggu verifikasi.`, waiting: `ajuan ${noun} OPD menunggu verifikasi tim Bagian Organisasi.` }
    : { empty: `Tidak ada ${noun} terverifikasi yang menunggu validasi.`, waiting: `${noun} terverifikasi menunggu validasi akhir tim Diskominfo.` };

/** Daftar antrean satu tahap pemeriksaan (generik untuk probis & layanan). Klik kartu untuk membuka detail. */
export function QueueList<T extends QueueItem>({
  rows,
  stage,
  noun,
  describe,
  renderDetail,
}: {
  rows: T[];
  stage: ReviewStage;
  noun: string;
  /** Baris kedua kartu, mis. "OPD · RAB L3". */
  describe: (row: T) => string;
  renderDetail: (row: T, close: () => void) => React.ReactNode;
}) {
  const [selected, setSelected] = useState<T | null>(null);
  const list = useRef<HTMLUListElement>(null);
  const text = copy(stage, noun);

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
        <EmptyState illustration="success" title="Antrean bersih" description={text.empty} />
      </Card>
    );
  }

  return (
    <Reveal className="grid gap-4">
      <p data-reveal className="text-sm text-muted-foreground">
        <b className="text-foreground tabular-nums">{rows.length}</b> {text.waiting}
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
                <span className="truncate text-xs text-muted-foreground">{describe(r)}</span>
              </span>
              <span className="hidden text-xs text-muted-foreground sm:block">{date.format(new Date(r.updatedAt))}</span>
              <Icon icon={ArrowRight01Icon} size={16} className="text-muted-foreground transition-transform duration-200 group-hover/q:translate-x-1" />
            </button>
          </li>
        ))}
      </ul>
      {selected && renderDetail(selected, () => setSelected(null))}
    </Reveal>
  );
}

/** Antrean probis: verifikasi (Bagian Organisasi) atau validasi (Diskominfo). */
export function ReviewQueue({ rows, actor, stage }: { rows: ProbisRecord[]; actor: Actor; stage: ReviewStage }) {
  const rabs = useRabSet();
  return (
    <QueueList
      rows={rows}
      stage={stage}
      noun="probis"
      describe={(r) => `${r.opdName} · ${r.rab3 ? rabs.forPeriod(r.period).label(r.rab3) : "RAB belum diisi"}`}
      renderDetail={(r, close) => <ProbisDetail record={r} actor={actor} onClose={close} />}
    />
  );
}
