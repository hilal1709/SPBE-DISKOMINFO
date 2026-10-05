"use client";
import { commitDataImport, previewDataImport } from "@/app/cms/data/actions";
import { StatusBadge } from "@/components/blocks/status-badge";
import { ImportPanel } from "@/components/cms/import-panel";
import { useRadSet } from "@/components/data/rad-context";
import { sifatLabel } from "@/lib/data/reference";

/** Impor/ekspor template Domain Arsitektur Data dan Informasi (template analis). Zip berisi semua domain bisa langsung diunggah. */
export function DataImport({ canImport, canExport }: { canImport: boolean; canExport: boolean }) {
  const rads = useRadSet();
  return (
    <ImportPanel
      canImport={canImport}
      canExport={canExport}
      preview={previewDataImport}
      commit={commitDataImport}
      copy={{
        noun: "data",
        workbook: "Domain Arsitektur Data dan Informasi",
        sheet: "Data dan Informasi",
        hint: "RAD Level 1–2 dilengkapi dari Level 3; sifat, jenis, validitas, proses bisnis, dan layanan dicocokkan otomatis.",
        template: "/templates/data.xlsx",
        exportHref: "/api/export/data",
        listHref: "/cms/data",
      }}
      refColumn={{
        header: "RAD · sifat",
        search: (r) => `${r.rad ?? ""} ${r.sifatRaw ?? ""}`,
        cell: (r) => (
          <span className="grid gap-1">
            <span className="text-muted-foreground">{r.rad ? rads.forPeriod(r.period).label(r.rad) : "—"}</span>
            {r.sifat && <StatusBadge status={sifatLabel[r.sifat]} />}
          </span>
        ),
      }}
    />
  );
}
