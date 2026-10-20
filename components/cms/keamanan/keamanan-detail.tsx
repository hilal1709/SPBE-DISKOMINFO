"use client";
import { deleteKeamanan, getKeamananReviews, reviewKeamanan } from "@/app/cms/keamanan/actions";
import { DetailDialog, DetailField, DetailSection } from "@/components/blocks/detail-dialog";
import { ToneBadge } from "@/components/blocks/status-badge";
import { ReviewBadge } from "@/components/cms/review-badge";
import { ReviewActions, ReviewHistory } from "@/components/cms/review-panel";
import { QueueList } from "@/components/cms/review-queue";
import { kegiatanEntries, tanggalText } from "@/components/keamanan/kegiatan";
import { Badge } from "@/components/ui/badge";
import { kegiatanConfig, masihBerlaku } from "@/lib/keamanan/jenis";
import type { Actor, ReviewStage } from "@/lib/permissions";
import type { KeamananRecord } from "@/lib/types";

const date = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" });

/** Pop-up detail kegiatan: kolom template analis, riwayat verifikasi, dan aksi sesuai peran. */
export function KeamananDetail({ record, actor, onClose }: { record: KeamananRecord; actor: Actor; onClose: () => void }) {
  const cfg = kegiatanConfig[record.jenis];
  const entries = kegiatanEntries(record);
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
          <ToneBadge tone={cfg.tone}>{cfg.short}</ToneBadge>
          {record.jenis === "standar" && <Badge variant={masihBerlaku(record) ? "success" : "muted"}>{masihBerlaku(record) ? "Berlaku" : "Tidak berlaku"}</Badge>}
          <Badge variant="muted">{record.opdName}</Badge>
        </>
      }
    >
      {record.deskripsi && (
        <DetailSection title="Deskripsi" tone="accent">
          <p className="text-sm leading-relaxed">{record.deskripsi}</p>
        </DetailSection>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        <DetailField label={cfg.dateLabel} value={tanggalText(record.tanggal)} />
        <DetailField label="Periode" value={record.period} />
        {entries.map((e) => (
          <DetailField key={e.label} label={e.label} value={e.value} className={e.wide ? "sm:col-span-2" : undefined} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Diperbarui {date.format(new Date(record.updatedAt))}</p>

      <ReviewHistory id={record.id} load={getKeamananReviews} />
      <ReviewActions record={record} actor={actor} noun="Kegiatan" domain="keamanan" editHref={`/cms/keamanan/${record.id}`} onReview={reviewKeamanan} onDelete={deleteKeamanan} onDone={onClose} />
    </DetailDialog>
  );
}

/** Antrean kegiatan: verifikasi (Verifikator Keamanan Diskominfo) atau validasi (Validator Diskominfo). */
export function KeamananReviewQueue({ rows, actor, stage }: { rows: KeamananRecord[]; actor: Actor; stage: ReviewStage }) {
  return (
    <QueueList
      rows={rows}
      stage={stage}
      noun="kegiatan keamanan"
      domain="keamanan"
      describe={(r) => `${kegiatanConfig[r.jenis].short} · ${r.opdName} · ${tanggalText(r.tanggal)}`}
      renderDetail={(r, close) => <KeamananDetail record={r} actor={actor} onClose={close} />}
    />
  );
}
