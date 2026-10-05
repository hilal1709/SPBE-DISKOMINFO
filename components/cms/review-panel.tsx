"use client";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { ArrowTurnBackwardIcon, CheckmarkCircle02Icon, Delete02Icon, PencilEdit02Icon, SentIcon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { DetailSection } from "@/components/blocks/detail-dialog";
import { ReviewBadge } from "@/components/cms/review-badge";
import { Icon } from "@/components/icon";
import { MOTION_OK, gsap } from "@/components/motion/gsap";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/cms/result";
import { can, stageOf, type Actor, type ReviewDomain } from "@/lib/permissions";
import { reviewLabel } from "@/lib/probis/reference";
import type { ProbisReview, SubmissionStatus } from "@/lib/types";

const date = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" });

export type Decision = "submit" | "verify" | "validate" | "reject";

/** Riwayat verifikasi (dimuat saat detail dibuka). */
export function ReviewHistory({ id, load }: { id: string; load: (id: string) => Promise<ProbisReview[]> }) {
  const [reviews, setReviews] = useState<ProbisReview[] | null>(null);
  useEffect(() => {
    let active = true;
    load(id).then((r) => active && setReviews(r));
    return () => {
      active = false;
    };
  }, [id, load]);

  return (
    <DetailSection title="Riwayat verifikasi">
      {reviews === null ? (
        <div className="grid gap-2">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      ) : reviews.length ? (
        <ol className="relative grid gap-3 border-l pl-4">
          {reviews.map((r) => (
            <li key={r.id} className="relative text-sm">
              <span aria-hidden className="absolute top-1.5 -left-[1.3rem] size-2.5 rounded-full border-2 border-card bg-brand-teal" />
              <p className="flex flex-wrap items-center gap-2">
                <ReviewBadge status={r.toStatus} />
                <span className="text-xs text-muted-foreground">
                  {r.actorName ?? "Sistem"} · {date.format(new Date(r.createdAt))}
                </span>
              </p>
              {r.note && <p className="mt-1 text-muted-foreground">{r.note}</p>}
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-muted-foreground">Belum ada riwayat.</p>
      )}
    </DetailSection>
  );
}

/**
 * Aksi sesuai peran pada pop-up detail: operator (hapus, ubah, ajukan) dan tim pemeriksa
 * (kembalikan dengan catatan wajib, verifikasi, validasi & tayangkan).
 */
export function ReviewActions({
  record,
  actor,
  noun,
  editHref,
  onReview,
  onDelete,
  onDone,
  domain = "probis",
}: {
  record: { id: string; name: string; status: SubmissionStatus; opdId: string };
  actor: Actor;
  /** "Probis" / "Layanan" untuk pesan toast. */
  noun: string;
  editHref: string;
  onReview: (id: string, decision: Decision, note?: string) => Promise<ActionResult<{ status: SubmissionStatus }>>;
  onDelete: (id: string) => Promise<ActionResult>;
  onDone: () => void;
  /** Menentukan tim verifikasi (Data: Verifikator Data Diskominfo). */
  domain?: ReviewDomain;
}) {
  const [note, setNote] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, start] = useTransition();
  const editable = can.edit(actor, record);
  const stage = stageOf(record.status);
  const awaiting = !!stage && can.review(actor, stage, domain);

  const act = (decision: Decision) =>
    start(async () => {
      const result = await onReview(record.id, decision, note);
      if (!result.ok) return void toast.error(result.error);
      toast.success(decision === "reject" ? `${noun} dikembalikan ke OPD` : `Status: ${reviewLabel[result.data.status]}`, { description: record.name });
      onDone();
    });

  const remove = () =>
    start(async () => {
      const result = await onDelete(record.id);
      if (!result.ok) return void toast.error(result.error);
      toast.success(`${noun} dihapus`, { description: record.name });
      onDone();
    });

  if (!awaiting && !editable) return null;
  return (
    <div className="grid gap-3 rounded-xl border border-dashed p-3">
      {awaiting && rejecting && <Textarea autoFocus rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Catatan untuk OPD: apa yang perlu diperbaiki?" aria-label="Catatan pengembalian" />}
      <div className="flex flex-wrap justify-end gap-2">
        {editable && (
          <>
            <Button variant={confirmDelete ? "destructive" : "ghost"} className="mr-auto" disabled={pending} onClick={() => (confirmDelete ? remove() : setConfirmDelete(true))} onBlur={() => setConfirmDelete(false)}>
              <Icon icon={Delete02Icon} size={16} />
              {confirmDelete ? "Klik lagi untuk menghapus" : "Hapus"}
            </Button>
            <Button asChild variant="outline">
              <Link href={editHref}>
                <Icon icon={PencilEdit02Icon} size={16} />
                Ubah
              </Link>
            </Button>
            <Button loading={pending} onClick={() => act("submit")}>
              {!pending && <Icon icon={SentIcon} size={16} />}
              Ajukan
            </Button>
          </>
        )}
        {awaiting && (
          <>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => {
                if (!rejecting) return setRejecting(true);
                if (!note.trim()) return void toast.error("Tuliskan catatan alasan pengembalian.");
                act("reject");
              }}
            >
              <Icon icon={ArrowTurnBackwardIcon} size={16} />
              {rejecting ? "Kirim pengembalian" : "Kembalikan"}
            </Button>
            {!rejecting && (
              <Button loading={pending} onClick={(e) => (pulse(e.currentTarget), act(stage === "verifikasi" ? "verify" : "validate"))}>
                {!pending && <Icon icon={CheckmarkCircle02Icon} size={16} />}
                {stage === "verifikasi" ? "Verifikasi" : "Validasi & tayangkan"}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function pulse(el: HTMLElement) {
  gsap.matchMedia().add(MOTION_OK, () => {
    gsap.fromTo(el, { scale: 0.94 }, { scale: 1, duration: 0.5, ease: "elastic.out(1.2, 0.5)" });
  });
}
