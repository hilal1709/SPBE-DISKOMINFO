"use client";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { ArrowTurnBackwardIcon, CheckmarkCircle02Icon, Delete02Icon, PencilEdit02Icon, SentIcon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { deleteProbis, getProbisReviews, reviewProbis } from "@/app/cms/actions";
import { DetailDialog, DetailField, DetailSection } from "@/components/blocks/detail-dialog";
import { ReviewBadge } from "@/components/cms/review-badge";
import { Icon } from "@/components/icon";
import { MOTION_OK, gsap } from "@/components/motion/gsap";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { can, stageOf, type Actor } from "@/lib/permissions";
import { useRab } from "@/components/probis/rab-context";
import { reviewLabel, statusLabel as probisLabel } from "@/lib/probis/reference";
import type { ProbisRecord, ProbisReview } from "@/lib/types";

const date = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" });

/** Pop-up detail probis: semua kolom template, riwayat verifikasi, dan aksi sesuai peran. */
export function ProbisDetail({ record, actor, onClose }: { record: ProbisRecord; actor: Actor; onClose: () => void }) {
  const index = useRab(record.period);
  /** RAB menurut versi periode probis; tandai bila sudah tidak berlaku. */
  const rab = (code: string | null) => {
    if (!code) return "—";
    const node = index.byCode.get(code);
    return `${index.text(code)}${node && !index.active(node) ? " (tidak berlaku)" : ""}`;
  };
  const [reviews, setReviews] = useState<ProbisReview[] | null>(null);
  const [note, setNote] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    let active = true;
    getProbisReviews(record.id).then((r) => active && setReviews(r));
    return () => {
      active = false;
    };
  }, [record.id]);

  const editable = can.edit(actor, record);
  const stage = stageOf(record.status);
  const awaiting = !!stage && can.review(actor, stage);

  const act = (decision: "submit" | "verify" | "validate" | "reject") =>
    start(async () => {
      const result = await reviewProbis(record.id, decision, note);
      if (!result.ok) return void toast.error(result.error);
      toast.success(decision === "reject" ? "Probis dikembalikan ke OPD" : `Status: ${reviewLabel[result.data.status]}`, { description: record.name });
      onClose();
    });

  const remove = () =>
    start(async () => {
      const result = await deleteProbis(record.id);
      if (!result.ok) return void toast.error(result.error);
      toast.success("Probis dihapus", { description: record.name });
      onClose();
    });

  return (
    <DetailDialog
      open
      onOpenChange={(open) => !open && onClose()}
      eyebrow={record.code}
      title={record.name}
      meta={
        <>
          <ReviewBadge status={record.status} />
          {record.isSample && <Badge variant="muted">Data contoh</Badge>}
          {record.rabReview && <Badge variant="warning">Perlu pemetaan RAB</Badge>}
          <Badge variant="secondary">{probisLabel[record.probisStatus]}</Badge>
          <Badge variant="info">{record.opdName}</Badge>
        </>
      }
    >
      {record.description && (
        <DetailSection title="Uraian" tone="accent">
          <p className="text-sm leading-relaxed text-muted-foreground">{record.description}</p>
        </DetailSection>
      )}
      <DetailSection title="Klasifikasi RAB">
        <div className="grid gap-2">
          <DetailField label="Level 1" value={rab(record.rab1)} />
          <DetailField label="Level 2" value={rab(record.rab2)} />
          <DetailField label="Level 3" value={rab(record.rab3)} />
          {(record.rabL4 || record.rabL5) && (
            <div className="grid gap-2 sm:grid-cols-2">
              <DetailField label="Level 4" value={index.text(record.rabL4) ?? "—"} />
              <DetailField label="Level 5" value={index.text(record.rabL5) ?? "—"} />
            </div>
          )}
        </div>
      </DetailSection>
      <div className="grid gap-2 sm:grid-cols-2">
        <DetailField label="Sasaran strategis" value={record.strategicGoal ?? "—"} className="sm:col-span-2" />
        <DetailField label="IKU" value={record.iku ?? "—"} className="sm:col-span-2" />
        <DetailField label="Nilai IKU target" value={record.ikuTarget ?? "—"} />
        <DetailField label="Nilai IKU terealisasi" value={record.ikuRealization ?? "—"} />
        <DetailField label="Periode" value={record.period} />
        <DetailField label="Diperbarui" value={date.format(new Date(record.updatedAt))} />
      </div>

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
                  <span className="text-xs text-muted-foreground">{r.actorName ?? "Sistem"} · {date.format(new Date(r.createdAt))}</span>
                </p>
                {r.note && <p className="mt-1 text-muted-foreground">{r.note}</p>}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">Belum ada riwayat.</p>
        )}
      </DetailSection>

      {(awaiting || editable) && (
        <div className="grid gap-3 rounded-xl border border-dashed p-3">
          {awaiting && rejecting && (
            <Textarea autoFocus rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Catatan untuk OPD: apa yang perlu diperbaiki?" aria-label="Catatan pengembalian" />
          )}
          <div className="flex flex-wrap justify-end gap-2">
            {editable && (
              <>
                <Button
                  variant={confirmDelete ? "destructive" : "ghost"}
                  className="mr-auto"
                  disabled={pending}
                  onClick={() => (confirmDelete ? remove() : setConfirmDelete(true))}
                  onBlur={() => setConfirmDelete(false)}
                >
                  <Icon icon={Delete02Icon} size={16} />
                  {confirmDelete ? "Klik lagi untuk menghapus" : "Hapus"}
                </Button>
                <Button asChild variant="outline">
                  <Link href={`/cms/proses-bisnis/${record.id}`}>
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
                    if (!rejecting) {
                      setRejecting(true);
                      return;
                    }
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
      )}
    </DetailDialog>
  );
}

function pulse(el: HTMLElement) {
  gsap.matchMedia().add(MOTION_OK, () => {
    gsap.fromTo(el, { scale: 0.94 }, { scale: 1, duration: 0.5, ease: "elastic.out(1.2, 0.5)" });
  });
}
