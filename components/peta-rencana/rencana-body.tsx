import { DetailField, DetailSection } from "@/components/blocks/detail-dialog";
import { StatusBadge, ToneBadge } from "@/components/blocks/status-badge";
import { Badge } from "@/components/ui/badge";
import { domains } from "@/lib/domains";
import { useMuatan } from "@/components/peta-rencana/muatan-context";
import { sourceLabel, statusConfig } from "@/lib/peta-rencana/muatan";
import type { Rencana } from "@/lib/types";

/** Bagian detail kegiatan Peta Rencana yang dipakai CMS dan dashboard publik. */

type Item = Omit<Rencana, "id" | "opd"> & { opdName: string };

export const RencanaStatus = ({ status }: { status: Rencana["status"] }) => <StatusBadge status={statusConfig[status].label} />;

export function RencanaMeta({ r }: { r: Item }) {
  const muatanBook = useMuatan();
  return (
    <>
      <RencanaStatus status={r.status} />
      <ToneBadge tone={muatanBook.get(r.muatan).tone}>{muatanBook.get(r.muatan).label}</ToneBadge>
      <Badge variant="muted">{r.year}</Badge>
      <Badge variant="muted">{r.opdName}</Badge>
    </>
  );
}

/** Isi pop-up: hierarki sasaran → inisiatif → program, target, lalu evaluasi & realisasi pada bagian terpisah. */
export function RencanaBody({ r }: { r: Item }) {
  return (
    <>
      <ol className="relative grid gap-3 border-l-2 border-brand-sky pl-4">
        {[
          ["Sasaran strategis", r.sasaran],
          ["Inisiatif strategis", r.inisiatif],
          ["Program", r.program],
        ]
          .filter(([, v]) => v)
          .map(([label, value]) => (
            <li key={label} className="relative">
              <span aria-hidden className="absolute top-1.5 -left-[1.3rem] size-2.5 rounded-full border-2 border-card bg-brand-teal" />
              <p className="eyebrow">{label}</p>
              <p className="text-sm font-medium">{value}</p>
            </li>
          ))}
      </ol>
      <div className="grid gap-2 sm:grid-cols-3">
        <DetailField label="Target" value={r.target ?? "—"} className="sm:col-span-2" />
        <DetailField label="Volume" value={`${r.jumlah.toLocaleString("id-ID")} ${r.satuan}`} />
        <DetailField label="Periode" value={r.period} />
        <DetailField label="Asal usulan" value={r.sourceRef ? `${sourceLabel[r.source]} · ${r.sourceRef}` : sourceLabel[r.source]} className="sm:col-span-2" />
      </div>
      {!!r.tautan?.length && (
        <DetailSection title="Arsitektur terkait">
          <ul className="grid gap-2">
            {r.tautan.map((l) => (
              <li key={`${l.domain}:${l.code}`} className="flex flex-wrap items-baseline gap-x-2 text-sm">
                <Badge variant="muted">{domains[l.domain].label}</Badge>
                <span className="font-medium">{l.name}</span>
                <span className="text-xs text-muted-foreground tabular-nums">{l.code}</span>
              </li>
            ))}
          </ul>
        </DetailSection>
      )}
      <DetailSection title="Evaluasi & realisasi" tone="accent">
        <div className="grid gap-2 sm:grid-cols-2">
          <DetailField label="Realisasi" value={r.realisasi ?? "Belum ada"} className="bg-card" />
          <DetailField label="Catatan evaluasi" value={r.evaluasi ?? "Belum ada"} className="bg-card" />
        </div>
      </DetailSection>
    </>
  );
}
