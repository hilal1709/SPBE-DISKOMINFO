"use client";
import { deleteInfrastruktur, getInfrastrukturReviews, reviewInfrastruktur } from "@/app/cms/infrastruktur/actions";
import { useRai, useRaiSet } from "@/components/infrastruktur/rai-context";
import { DetailDialog, DetailField, DetailSection } from "@/components/blocks/detail-dialog";
import { ToneBadge } from "@/components/blocks/status-badge";
import { ReviewBadge } from "@/components/cms/review-badge";
import { ReviewActions, ReviewHistory } from "@/components/cms/review-panel";
import { QueueList } from "@/components/cms/review-queue";
import { useSecurityRefs } from "@/components/keamanan/security-context";
import { Badge } from "@/components/ui/badge";
import { securityFields } from "@/lib/data/reference";
import { jenisConfig, kepemilikanLabel } from "@/lib/infrastruktur/jenis";
import { RelasiSection, attrEntries } from "@/components/infrastruktur/relasi";
import type { Actor, ReviewStage } from "@/lib/permissions";
import type { InfrastrukturRecord } from "@/lib/types";

const date = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" });

/** Pop-up detail komponen: kolom bersama, kolom khusus template, relasi, keamanan, riwayat, dan aksi sesuai peran. */
export function InfrastrukturDetail({ record, actor, onClose }: { record: InfrastrukturRecord; actor: Actor; onClose: () => void }) {
  const index = useRai(record.period);
  const cfg = jenisConfig[record.jenis];
  const rai = (code: string | null) => {
    if (!code) return "—";
    const node = index.byCode.get(code);
    return `${index.text(code)}${node && !index.active(node) ? " (tidak berlaku)" : ""}`;
  };
  const security = securityFields.filter((f) => record.security[f.key]?.length);
  const sec = useSecurityRefs();
  const attrs = attrEntries(record);

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
          {record.raiReview && <Badge variant="warning">Perlu pemetaan RAI</Badge>}
          <ToneBadge tone={cfg.tone}>{cfg.label}</ToneBadge>
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
        <DetailField label="Klasifikasi RAI" value={rai(record.rai3 ?? record.rai2)} />
        <DetailField label="Periode" value={record.period} />
        {cfg.common.includes("pemilik") && <DetailField label="Nama pemilik" value={record.pemilik ?? "—"} />}
        {cfg.common.includes("kepemilikan") && <DetailField label="Status kepemilikan" value={record.kepemilikan ? kepemilikanLabel[record.kepemilikan] : "—"} />}
        {cfg.common.includes("pengelola") && <DetailField label="Unit pengelola" value={record.pengelola ?? "—"} />}
      </div>
      {attrs.length > 0 && (
        <DetailSection title="Spesifikasi">
          <div className="grid gap-2 sm:grid-cols-2">
            {attrs.map((a) => (
              <DetailField key={a.label} label={a.label} value={a.value} />
            ))}
          </div>
        </DetailSection>
      )}
      <RelasiSection r={record} />
      {security.length > 0 && (
        <DetailSection title="Keamanan SPBE">
          <div className="grid gap-2 sm:grid-cols-2">
            {security.map((f) => (
              <DetailField key={f.key} label={f.label} value={record.security[f.key]!.map((v) => sec.label(v, f.key, record.period)).join("; ")} />
            ))}
          </div>
        </DetailSection>
      )}
      <p className="text-xs text-muted-foreground">Diperbarui {date.format(new Date(record.updatedAt))}</p>

      <ReviewHistory id={record.id} load={getInfrastrukturReviews} />
      <ReviewActions
        record={record}
        actor={actor}
        noun="Komponen"
        domain="infrastruktur"
        editHref={`/cms/infrastruktur/${record.id}`}
        onReview={reviewInfrastruktur}
        onDelete={deleteInfrastruktur}
        onDone={onClose}
      />
    </DetailDialog>
  );
}

/** Antrean komponen: verifikasi (Verifikator Infrastruktur Diskominfo) atau validasi (Validator Diskominfo). */
export function InfrastrukturReviewQueue({ rows, actor, stage }: { rows: InfrastrukturRecord[]; actor: Actor; stage: ReviewStage }) {
  const rais = useRaiSet();
  const raiText = (r: InfrastrukturRecord) => {
    const code = r.rai3 ?? r.rai2;
    return code ? rais.forPeriod(r.period).label(code) : "RAI belum diisi";
  };
  return (
    <QueueList
      rows={rows}
      stage={stage}
      noun="komponen infrastruktur"
      domain="infrastruktur"
      describe={(r) => `${jenisConfig[r.jenis].label} · ${r.opdName} · ${raiText(r)}`}
      renderDetail={(r, close) => <InfrastrukturDetail record={r} actor={actor} onClose={close} />}
    />
  );
}
