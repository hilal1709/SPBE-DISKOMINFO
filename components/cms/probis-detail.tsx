"use client";
import { deleteProbis, getProbisReviews, reviewProbis } from "@/app/cms/actions";
import { DetailDialog, DetailField, DetailSection } from "@/components/blocks/detail-dialog";
import { ReviewBadge } from "@/components/cms/review-badge";
import { ReviewActions, ReviewHistory } from "@/components/cms/review-panel";
import { useRab } from "@/components/probis/rab-context";
import { Badge } from "@/components/ui/badge";
import type { Actor } from "@/lib/permissions";
import { statusLabel as probisLabel } from "@/lib/probis/reference";
import type { ProbisRecord } from "@/lib/types";

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

      <ReviewHistory id={record.id} load={getProbisReviews} />
      <ReviewActions record={record} actor={actor} noun="Probis" editHref={`/cms/proses-bisnis/${record.id}`} onReview={reviewProbis} onDelete={deleteProbis} onDone={onClose} />
    </DetailDialog>
  );
}
