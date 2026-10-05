"use client";
import { deleteData, getDataReviews, reviewData } from "@/app/cms/data/actions";
import { DetailDialog, DetailField, DetailSection } from "@/components/blocks/detail-dialog";
import { StatusBadge } from "@/components/blocks/status-badge";
import { ReviewBadge } from "@/components/cms/review-badge";
import { ReviewActions, ReviewHistory } from "@/components/cms/review-panel";
import { QueueList } from "@/components/cms/review-queue";
import { useRad, useRadSet } from "@/components/data/rad-context";
import { Badge } from "@/components/ui/badge";
import { jenisLabel, securityFields, sifatLabel } from "@/lib/data/reference";
import type { Actor, ReviewStage } from "@/lib/permissions";
import { pdByCode } from "@/lib/probis/reference";
import type { DataRecord } from "@/lib/types";

const date = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" });

function Links({ items, empty }: { items: { id: string; name: string }[]; empty: string }) {
  return items.length ? (
    <ul className="grid gap-1.5 text-sm">
      {items.map((p) => (
        <li key={p.id} className="flex items-baseline gap-2">
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{p.id}</span>
          {p.name}
        </li>
      ))}
    </ul>
  ) : (
    <p className="text-sm text-muted-foreground">{empty}</p>
  );
}

/** Pop-up detail data: semua kolom template analis, riwayat verifikasi, dan aksi sesuai peran. */
export function DataDetail({ record, actor, onClose }: { record: DataRecord; actor: Actor; onClose: () => void }) {
  const index = useRad(record.period);
  /** RAD menurut versi periode data; tandai bila sudah tidak berlaku. */
  const rad = (code: string | null) => {
    if (!code) return "—";
    const node = index.byCode.get(code);
    return `${index.text(code)}${node && !index.active(node) ? " (tidak berlaku)" : ""}`;
  };
  const security = securityFields.filter((f) => record.security[f.key]?.length);

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
          {record.radReview && <Badge variant="warning">Perlu pemetaan RAD</Badge>}
          <StatusBadge status={sifatLabel[record.sifat]} />
          <Badge variant="info">{record.opdName}</Badge>
        </>
      }
    >
      <DetailSection title="Uraian & tujuan" tone="accent">
        <p className="text-sm leading-relaxed">{record.uraian}</p>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{record.tujuan}</p>
      </DetailSection>
      <DetailSection title="Klasifikasi RAD">
        <div className="grid gap-2">
          <DetailField label="Level 1" value={rad(record.rad1)} />
          <DetailField label="Level 2" value={rad(record.rad2)} />
          <DetailField label="Level 3" value={rad(record.rad3)} />
          {record.radL4 && <DetailField label="Level 4" value={index.text(record.radL4) ?? "—"} />}
        </div>
      </DetailSection>
      <div className="grid gap-2 sm:grid-cols-2">
        <DetailField label="Produsen data" value={record.produsen ? (pdByCode.get(record.produsen)?.name ?? record.produsen) : record.opdName} />
        <DetailField label="Jenis data" value={jenisLabel[record.jenis]} />
        <DetailField label="Validitas" value={record.validitas} />
        <DetailField label="Interoperabilitas" value={record.interoperabel ? "Ya" : "Tidak"} />
        <DetailField label="Informasi terkait (output)" value={record.output ?? "—"} />
        <DetailField label="Informasi terkait (input)" value={record.input ?? "—"} />
        <DetailField label="Periode" value={record.period} />
        <DetailField label="Diperbarui" value={date.format(new Date(record.updatedAt))} />
      </div>
      <DetailSection title="Dependensi">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid content-start gap-1.5">
            <p className="text-xs font-medium text-muted-foreground">← Proses bisnis penghasil</p>
            <Links items={record.probis} empty="Belum ditautkan ke proses bisnis." />
          </div>
          <div className="grid content-start gap-1.5">
            <p className="text-xs font-medium text-muted-foreground">→ Layanan pengguna</p>
            <Links items={record.layanan} empty="Belum ditautkan ke layanan." />
          </div>
        </div>
      </DetailSection>
      {security.length > 0 && (
        <DetailSection title="Keamanan SPBE">
          <div className="grid gap-2 sm:grid-cols-2">
            {security.map((f) => (
              <DetailField key={f.key} label={f.label} value={record.security[f.key]!.join("; ")} />
            ))}
          </div>
        </DetailSection>
      )}

      <ReviewHistory id={record.id} load={getDataReviews} />
      <ReviewActions record={record} actor={actor} noun="Data" domain="data" editHref={`/cms/data/${record.id}`} onReview={reviewData} onDelete={deleteData} onDone={onClose} />
    </DetailDialog>
  );
}

/** Antrean data: verifikasi (Verifikator Data Diskominfo) atau validasi (Validator Diskominfo). */
export function DataReviewQueue({ rows, actor, stage }: { rows: DataRecord[]; actor: Actor; stage: ReviewStage }) {
  const rads = useRadSet();
  const radText = (r: DataRecord) => {
    const code = r.rad3 ?? r.rad2;
    return code ? rads.forPeriod(r.period).label(code) : "RAD belum diisi";
  };
  return (
    <QueueList
      rows={rows}
      stage={stage}
      noun="data"
      domain="data"
      describe={(r) => `${r.opdName} · ${sifatLabel[r.sifat]} · ${radText(r)}`}
      renderDetail={(r, close) => <DataDetail record={r} actor={actor} onClose={close} />}
    />
  );
}
