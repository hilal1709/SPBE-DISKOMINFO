"use client";
import { commitImport, previewImport } from "@/app/cms/actions";
import { ImportPanel } from "@/components/cms/import-panel";
import { useRabSet } from "@/components/probis/rab-context";

/** Impor/ekspor template Domain Arsitektur Proses Bisnis. */
export function ProbisImport({ canImport, canExport }: { canImport: boolean; canExport: boolean }) {
  const rabs = useRabSet();
  return (
    <ImportPanel
      canImport={canImport}
      canExport={canExport}
      preview={previewImport}
      commit={commitImport}
      copy={{
        noun: "probis",
        workbook: "Domain Arsitektur Proses Bisnis",
        sheet: "Proses Bisnis",
        hint: "Kolom RAB Level 1–2 dilengkapi otomatis dari Level 3.",
        template: "/templates/proses-bisnis.xlsx",
        exportHref: "/api/export/proses-bisnis",
        listHref: "/cms/proses-bisnis",
      }}
      refColumn={{
        header: "RAB 3",
        search: (r) => r.rab3 ?? "",
        cell: (r) => (r.rab3 ? <span className="text-muted-foreground">{rabs.forPeriod(r.period).label(r.rab3)}</span> : "—"),
      }}
    />
  );
}
