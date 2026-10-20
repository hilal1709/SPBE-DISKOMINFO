"use client";
import { deleteAplikasi, getAplikasiReviews, reviewAplikasi } from "@/app/cms/aplikasi/actions";
import { useRaa, useRaaSet } from "@/components/aplikasi/raa-context";
import { Banner } from "@/components/blocks/banner";
import { DetailDialog, DetailField, DetailSection } from "@/components/blocks/detail-dialog";
import { ReviewBadge } from "@/components/cms/review-badge";
import { ReviewActions, ReviewHistory } from "@/components/cms/review-panel";
import { QueueList } from "@/components/cms/review-queue";
import { useSecurityRefs } from "@/components/keamanan/security-context";
import { Badge } from "@/components/ui/badge";
import { flowLabels } from "@/lib/aplikasi/data-flow";
import { basisLabel, infraFields, kepemilikanLabel, lisensiLabel } from "@/lib/aplikasi/reference";
import { securityFields } from "@/lib/data/reference";
import type { Actor, ReviewStage } from "@/lib/permissions";
import { pdByCode } from "@/lib/probis/reference";
import type { AplikasiRecord } from "@/lib/types";

const date = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" });

function Links({ items, empty }: { items: { id: string; name: string; status?: string }[]; empty: string }) {
  return items.length ? (
    <ul className="grid gap-1.5 text-sm">
      {items.map((p) => (
        <li key={p.id} className="flex items-baseline gap-2">
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{p.id}</span>
          <span>
            {p.name}
            {p.status && p.status !== "approved" && (
              <Badge variant="warning" className="ml-2 align-middle">
                Belum tervalidasi
              </Badge>
            )}
          </span>
        </li>
      ))}
    </ul>
  ) : (
    <p className="text-sm text-muted-foreground">{empty}</p>
  );
}

/** Pop-up detail aplikasi: semua kolom template analis, riwayat verifikasi, dan aksi sesuai peran. */
export function AplikasiDetail({ record, actor, onClose }: { record: AplikasiRecord; actor: Actor; onClose: () => void }) {
  const index = useRaa(record.period);
  const raa = (code: string | null) => {
    if (!code) return "—";
    const node = index.byCode.get(code);
    return `${index.text(code)}${node && !index.active(node) ? " (tidak berlaku)" : ""}`;
  };
  const security = securityFields.filter((f) => record.security[f.key]?.length);
  const sec = useSecurityRefs();
  const aligned = record.probis.some((p) => p.status === "approved");
  const pengembang = pdByCode.get(record.pengembang)?.name ?? record.pengembang;

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
          {record.raaReview && <Badge variant="warning">Perlu pemetaan RAA</Badge>}
          <Badge variant="info">{kepemilikanLabel[record.kepemilikan]}</Badge>
          <Badge variant="muted">{record.opdName}</Badge>
        </>
      }
    >
      {!aligned && (
        <Banner variant="warning" label="Belum selaras" dismissible={false}>
          Aplikasi belum tertaut proses bisnis yang disetujui, sehingga tidak dapat diverifikasi atau divalidasi.
        </Banner>
      )}
      <DetailSection title="Uraian & fungsi" tone="accent">
        <p className="text-sm leading-relaxed">{record.uraian}</p>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{record.fungsi}</p>
      </DetailSection>
      <div className="grid gap-2 sm:grid-cols-2">
        <DetailField label="Luaran" value={record.luaran} />
        <DetailField label="Klasifikasi RAA" value={raa(record.raa3 ?? record.raa2)} />
        <DetailField label="Unit pengembang" value={pengembang} />
        <DetailField label="Unit operasional teknologi" value={record.opdName} />
        <DetailField label="Basis · lisensi" value={`${basisLabel[record.basis]} · ${lisensiLabel[record.lisensi]}`} />
        <DetailField label="Bahasa · kerangka" value={[record.bahasa, record.kerangka].filter(Boolean).join(" · ")} />
        <DetailField label="Mesin basis data" value={record.mesin ?? "—"} />
        <DetailField label="Periode" value={record.period} />
      </div>
      <DetailSection title="Dependensi">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="grid content-start gap-1.5">
            <p className="text-xs font-medium text-muted-foreground">← Proses bisnis</p>
            <Links items={record.probis} empty="Belum ditautkan ke proses bisnis." />
          </div>
          <div className="grid content-start gap-1.5">
            <p className="text-xs font-medium text-muted-foreground">→ Layanan</p>
            <Links items={record.layanan} empty="Belum ditautkan ke layanan." />
          </div>
          <div className="grid content-start gap-1.5">
            <p className="text-xs font-medium text-muted-foreground">→ Data digunakan</p>
            <Links items={record.data} empty="Belum ditautkan ke data." />
          </div>
        </div>
      </DetailSection>
      {(record.inputData || record.outputData || record.supplier || record.customer) && (
        <DetailSection title="Aliran data">
          <div className="grid gap-2 sm:grid-cols-2">
            <DetailField label="← Inputan data" value={flowLabels(record.inputData, record.dataNames).join("; ") || "—"} />
            <DetailField label="→ Supplier data" value={record.supplier ?? "—"} />
            <DetailField label="→ Luaran data" value={flowLabels(record.outputData, record.dataNames).join("; ") || "—"} />
            <DetailField label="→ Customer data" value={record.customer ?? "—"} />
          </div>
        </DetailSection>
      )}
      <DetailSection title="Infrastruktur">
        <div className="grid gap-2 sm:grid-cols-2">
          {infraFields.map((f) => (
            <DetailField key={f.key} label={f.label} value={record[f.key] ?? "Tidak memakai"} />
          ))}
        </div>
      </DetailSection>
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

      <ReviewHistory id={record.id} load={getAplikasiReviews} />
      <ReviewActions record={record} actor={actor} noun="Aplikasi" domain="aplikasi" editHref={`/cms/aplikasi/${record.id}`} onReview={reviewAplikasi} onDelete={deleteAplikasi} onDone={onClose} />
    </DetailDialog>
  );
}

/** Antrean aplikasi: verifikasi (Verifikator Aplikasi Diskominfo) atau validasi (Validator Diskominfo). */
export function AplikasiReviewQueue({ rows, actor, stage }: { rows: AplikasiRecord[]; actor: Actor; stage: ReviewStage }) {
  const raas = useRaaSet();
  const raaText = (r: AplikasiRecord) => {
    const code = r.raa3 ?? r.raa2;
    return code ? raas.forPeriod(r.period).label(code) : "RAA belum diisi";
  };
  return (
    <QueueList
      rows={rows}
      stage={stage}
      noun="aplikasi"
      domain="aplikasi"
      describe={(r) => `${r.opdName} · ${kepemilikanLabel[r.kepemilikan]} · ${raaText(r)}${r.probis.some((p) => p.status === "approved") ? "" : " · belum selaras probis"}`}
      renderDetail={(r, close) => <AplikasiDetail record={r} actor={actor} onClose={close} />}
    />
  );
}
