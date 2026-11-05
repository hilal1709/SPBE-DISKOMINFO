"use client";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowTurnBackwardIcon, CheckmarkCircle02Icon, Delete02Icon, PencilEdit02Icon, SentIcon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { DetailSection } from "@/components/blocks/detail-dialog";
import { ReviewBadge } from "@/components/cms/review-badge";
import { Icon } from "@/components/icon";
import { MOTION_OK, gsap } from "@/components/motion/gsap";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { isOwnVerification } from "@/app/cms/workflow-actions";
import type { ActionResult } from "@/lib/cms/result";
import { can, stageOf, type Actor, type ReviewDomain } from "@/lib/permissions";
import { reviewLabel } from "@/lib/probis/reference";
import type { ProbisReview, SubmissionStatus } from "@/lib/types";

const date = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" });

export type Decision = "submit" | "verify" | "validate" | "reject" | "withdraw";

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
 * Aksi sesuai peran pada pop-up detail: operator (hapus, ubah, ajukan dengan konfirmasi), tim pemeriksa
 * (kembalikan dengan catatan wajib, verifikasi, validasi & tayangkan), dan Tarik dari portal (alasan wajib).
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
  const [dialog, setDialog] = useState<"submit" | "withdraw" | null>(null);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  /** Kunci sinkron: klik ganda dalam satu frame tidak mengirim dua permintaan (B5). */
  const busy = useRef(false);
  const editable = can.edit(actor, record);
  const submittable = can.submit(actor, record);
  const withdrawable = can.withdraw(actor, record);
  /** Record tayang harus ditarik dulu sebelum dihapus. */
  const deletable = editable && record.status !== "approved";
  const stage = stageOf(record.status);
  const awaiting = !!stage && can.review(actor, stage, domain);
  /** B4: akun yang memverifikasi tidak boleh memvalidasi record yang sama (server juga menolak). */
  const [ownVerification, setOwnVerification] = useState(false);
  useEffect(() => {
    if (!awaiting || stage !== "validasi") return;
    let active = true;
    isOwnVerification(domain, record.id).then((own) => active && setOwnVerification(own));
    return () => {
      active = false;
    };
  }, [awaiting, stage, domain, record.id]);

  const run = (task: () => Promise<void>) => {
    if (busy.current) return;
    busy.current = true;
    start(async () => {
      try {
        await task();
      } finally {
        busy.current = false;
      }
    });
  };

  const act = (decision: Decision, text = note) =>
    run(async () => {
      const result = await onReview(record.id, decision, text);
      if (!result.ok) return void toast.error(result.error);
      setDialog(null);
      const message = decision === "reject" ? `${noun} dikembalikan ke OPD` : decision === "withdraw" ? `${noun} ditarik dari portal` : `Status: ${reviewLabel[result.data.status]}`;
      toast.success(message, { description: record.name });
      onDone();
    });

  const remove = () =>
    run(async () => {
      const result = await onDelete(record.id);
      if (!result.ok) return void toast.error(result.error);
      toast.success(`${noun} dihapus`, { description: record.name });
      onDone();
    });

  if (!awaiting && !editable && !withdrawable) return null;
  return (
    <div className="grid gap-3 rounded-xl border border-dashed p-3">
      {ownVerification && !rejecting && (
        <p className="text-xs text-muted-foreground">Anda yang memverifikasi record ini. Validasi harus dilakukan akun lain; Anda masih bisa mengembalikannya.</p>
      )}
      {awaiting && rejecting && <Textarea autoFocus rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Catatan untuk OPD: apa yang perlu diperbaiki?" aria-label="Catatan pengembalian" />}
      <div className="flex flex-wrap justify-end gap-2">
        {deletable && (
          <Button variant={confirmDelete ? "destructive" : "ghost"} className="mr-auto" disabled={pending} onClick={() => (confirmDelete ? remove() : setConfirmDelete(true))} onBlur={() => setConfirmDelete(false)}>
            <Icon icon={Delete02Icon} size={16} />
            {confirmDelete ? "Klik lagi untuk menghapus" : "Hapus"}
          </Button>
        )}
        {withdrawable && (
          <Button variant="outline" className={deletable ? undefined : "mr-auto"} disabled={pending} onClick={() => (setReason(""), setDialog("withdraw"))}>
            <Icon icon={ArrowTurnBackwardIcon} size={16} />
            Tarik dari portal
          </Button>
        )}
        {editable && (
          <Button asChild variant="outline">
            <Link href={editHref}>
              <Icon icon={PencilEdit02Icon} size={16} />
              Ubah
            </Link>
          </Button>
        )}
        {submittable && (
          <Button disabled={pending} onClick={() => setDialog("submit")}>
            <Icon icon={SentIcon} size={16} />
            Ajukan
          </Button>
        )}
        {awaiting && (
          <>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => {
                if (!rejecting) return setRejecting(true);
                act("reject");
              }}
            >
              <Icon icon={ArrowTurnBackwardIcon} size={16} />
              {rejecting ? "Kirim pengembalian" : "Kembalikan"}
            </Button>
            {!rejecting && (
              <Button
                loading={pending}
                disabled={ownVerification}
                title={ownVerification ? "Validasi harus oleh akun yang berbeda dari verifikator" : undefined}
                onClick={(e) => (pulse(e.currentTarget), act(stage === "verifikasi" ? "verify" : "validate"))}
              >
                {!pending && <Icon icon={CheckmarkCircle02Icon} size={16} />}
                {stage === "verifikasi" ? "Verifikasi" : "Validasi & tayangkan"}
              </Button>
            )}
          </>
        )}
      </div>

      <AlertDialog open={dialog !== null} onOpenChange={(open) => !open && !pending && setDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialog === "withdraw" ? "Tarik dari portal?" : `Ajukan ${noun.toLowerCase()} ini?`}</AlertDialogTitle>
            <AlertDialogDescription>
              {dialog === "withdraw"
                ? "Record kembali ke Draf dan tidak tampil di portal sampai diajukan dan divalidasi ulang."
                : "Record dikirim ke tim verifikasi dan tidak dapat diubah selama ditinjau."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {dialog === "withdraw" && (
            <Textarea autoFocus rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Alasan penarikan (wajib)" aria-label="Alasan penarikan" />
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Batal</AlertDialogCancel>
            <Button
              variant={dialog === "withdraw" ? "destructive" : "default"}
              loading={pending}
              disabled={dialog === "withdraw" && !reason.trim()}
              onClick={() => (dialog === "withdraw" ? act("withdraw", reason) : act("submit"))}
            >
              {dialog === "withdraw" ? "Tarik dari portal" : "Ajukan"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function pulse(el: HTMLElement) {
  gsap.matchMedia().add(MOTION_OK, () => {
    gsap.fromTo(el, { scale: 0.94 }, { scale: 1, duration: 0.5, ease: "elastic.out(1.2, 0.5)" });
  });
}
