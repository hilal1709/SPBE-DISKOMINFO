"use client";
import { commitLayananImport, previewLayananImport } from "@/app/cms/layanan/actions";
import { StatusBadge } from "@/components/blocks/status-badge";
import { ImportPanel } from "@/components/cms/import-panel";
import { useRalSet } from "@/components/layanan/ral-context";
import { metodeLabel } from "@/lib/layanan/reference";

/** Impor/ekspor template Domain Arsitektur Layanan (template analis). */
export function LayananImport({ canImport, canExport }: { canImport: boolean; canExport: boolean }) {
  const rals = useRalSet();
  return (
    <ImportPanel
      canImport={canImport}
      canExport={canExport}
      preview={previewLayananImport}
      commit={commitLayananImport}
      copy={{
        noun: "layanan",
        workbook: "Domain Arsitektur Layanan",
        sheet: "Layanan",
        hint: "RAL Level 1–2 dilengkapi dari Level 3; target, metode, dan proses bisnis dicocokkan otomatis.",
        template: "/templates/layanan.xlsx",
        exportHref: "/api/export/layanan",
        listHref: "/cms/layanan",
      }}
      refColumn={{
        header: "RAL 3 · metode",
        search: (r) => `${r.ral3 ?? ""} ${r.metodeRaw ?? ""}`,
        cell: (r) => (
          <span className="grid gap-1">
            <span className="text-muted-foreground">{r.ral3 ? rals.forPeriod(r.period).label(r.ral3) : "—"}</span>
            {r.metode && <StatusBadge status={metodeLabel[r.metode]} />}
          </span>
        ),
      }}
    />
  );
}
