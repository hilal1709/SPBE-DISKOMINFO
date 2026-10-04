"use client";
import { deleteLayanan, getLayananReviews, reviewLayanan } from "@/app/cms/layanan/actions";
import { DetailDialog, DetailField, DetailSection } from "@/components/blocks/detail-dialog";
import { StatusBadge } from "@/components/blocks/status-badge";
import { ReviewBadge } from "@/components/cms/review-badge";
import { ReviewActions, ReviewHistory } from "@/components/cms/review-panel";
import { QueueList } from "@/components/cms/review-queue";
import { useRal, useRalSet } from "@/components/layanan/ral-context";
import { useRab } from "@/components/probis/rab-context";
import { Badge } from "@/components/ui/badge";
import { metodeLabel, targetLabel } from "@/lib/layanan/reference";
import type { Actor, ReviewStage } from "@/lib/permissions";
import type { LayananRecord } from "@/lib/types";

const date = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" });

/** Pop-up detail layanan: semua kolom template analis, riwayat verifikasi, dan aksi sesuai peran. */
export function LayananDetail({ record, actor, onClose }: { record: LayananRecord; actor: Actor; onClose: () => void }) {
  const index = useRal(record.period);
  const rab = useRab(record.period);
  /** RAL menurut versi periode layanan; tandai bila sudah tidak berlaku. */
  const ral = (code: string | null) => {
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
          {record.ralReview && <Badge variant="warning">Perlu pemetaan RAL</Badge>}
          <StatusBadge status={metodeLabel[record.metode]} />
          <Badge variant="info">{record.opdName}</Badge>
        </>
      }
    >
      <DetailSection title="Tujuan & fungsi" tone="accent">
        <p className="text-sm leading-relaxed">{record.tujuan}</p>
        {record.fungsi && <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{record.fungsi}</p>}
      </DetailSection>
      <DetailSection title="Klasifikasi RAL">
        <div className="grid gap-2">
          <DetailField label="Level 1" value={ral(record.ral1)} />
          <DetailField label="Level 2" value={ral(record.ral2)} />
          <DetailField label="Level 3" value={ral(record.ral3)} />
          {(record.ralL4 || record.ralL5) && (
            <div className="grid gap-2 sm:grid-cols-2">
              <DetailField label="Level 4" value={index.text(record.ralL4) ?? "—"} />
              <DetailField label="Level 5" value={index.text(record.ralL5) ?? "—"} />
            </div>
          )}
        </div>
      </DetailSection>
      <div className="grid gap-2 sm:grid-cols-2">
        <DetailField label="Target layanan" value={targetLabel[record.target]} />
        <DetailField label="Bidang/UPT pelaksana" value={record.unit ?? "—"} />
        <DetailField label="Urusan pemerintahan" value={record.rab2 ? rab.label(record.rab2) : "—"} />
        <DetailField label="Kementerian/Lembaga terkait" value={record.kl ?? "—"} />
        <DetailField label="Potensi manfaat" value={record.manfaat ?? "—"} />
        <DetailField label="Potensi ekonomi" value={record.ekonomi ?? "—"} />
        <DetailField label="Potensi risiko" value={record.risiko ?? "—"} />
        <DetailField label="Mitigasi" value={record.mitigasi ?? "—"} />
        <DetailField label="Periode" value={record.period} />
        <DetailField label="Diperbarui" value={date.format(new Date(record.updatedAt))} />
      </div>
      <DetailSection title="Proses bisnis yang dilayani">
        {record.probis.length ? (
          <ul className="grid gap-1.5 text-sm">
            {record.probis.map((p) => (
              <li key={p.id} className="flex items-baseline gap-2">
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{p.id}</span>
                {p.name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Belum ditautkan ke proses bisnis.</p>
        )}
      </DetailSection>

      <ReviewHistory id={record.id} load={getLayananReviews} />
      <ReviewActions record={record} actor={actor} noun="Layanan" editHref={`/cms/layanan/${record.id}`} onReview={reviewLayanan} onDelete={deleteLayanan} onDone={onClose} />
    </DetailDialog>
  );
}

/** Antrean layanan: verifikasi (Bagian Organisasi) atau validasi (Diskominfo). */
export function LayananReviewQueue({ rows, actor, stage }: { rows: LayananRecord[]; actor: Actor; stage: ReviewStage }) {
  const rals = useRalSet();
  return (
    <QueueList
      rows={rows}
      stage={stage}
      noun="layanan"
      describe={(r) => `${r.opdName} · ${metodeLabel[r.metode]} · ${r.ral3 ? rals.forPeriod(r.period).label(r.ral3) : "RAL belum diisi"}`}
      renderDetail={(r, close) => <LayananDetail record={r} actor={actor} onClose={close} />}
    />
  );
}
