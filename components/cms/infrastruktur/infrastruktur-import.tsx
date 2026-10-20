"use client";
import { commitInfrastrukturImport, previewInfrastrukturImport } from "@/app/cms/infrastruktur/actions";
import { useRaiSet } from "@/components/infrastruktur/rai-context";
import { ImportPanel } from "@/components/cms/import-panel";
import { ToneBadge } from "@/components/blocks/status-badge";
import { jenisConfig } from "@/lib/infrastruktur/jenis";

/**
 * Impor/ekspor 10 template Domain Arsitektur Infrastruktur. Bisa satu workbook komponen, workbook gabungan (satu sheet
 * per komponen), atau zip folder Infrastruktur / paket arsitektur semua domain.
 */
export function InfrastrukturImport({ canImport, canExport }: { canImport: boolean; canExport: boolean }) {
  const rais = useRaiSet();
  return (
    <ImportPanel
      canImport={canImport}
      canExport={canExport}
      preview={previewInfrastrukturImport}
      commit={commitInfrastrukturImport}
      copy={{
        noun: "komponen",
        workbook: "Domain Arsitektur Infrastruktur",
        sheet: "komponen",
        hint: "Komponen dikenali dari nama berkas/sheet; RAI kosong diisi RAI bawaan komponen, relasi antarkomponen dalam satu unggahan ikut ditautkan.",
        template: "/templates/infrastruktur.xlsx",
        exportHref: "/api/export/infrastruktur",
        listHref: "/cms/infrastruktur",
      }}
      refColumn={{
        header: "Komponen · RAI",
        search: (r) => `${jenisConfig[r.jenis].label} ${r.rai ?? ""}`,
        cell: (r) => (
          <span className="grid gap-1">
            <ToneBadge tone={jenisConfig[r.jenis].tone}>{jenisConfig[r.jenis].short}</ToneBadge>
            <span className="text-muted-foreground">{r.rai ? rais.forPeriod(r.period).label(r.rai) : "—"}</span>
          </span>
        ),
      }}
    />
  );
}
