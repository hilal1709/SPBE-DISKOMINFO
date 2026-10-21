"use client";
import { commitRencanaImport, previewRencanaImport } from "@/app/cms/peta-rencana/actions";
import { ToneBadge } from "@/components/blocks/status-badge";
import { ImportPanel } from "@/components/cms/import-panel";
import { muatanConfig } from "@/lib/peta-rencana/muatan";

/** Impor/ekspor Peta Rencana: satu sheet berkolom Sasaran … Kegiatan … Tahun (format tabel Peta Rencana Gresik). */
export function RencanaImport({ canImport, canExport }: { canImport: boolean; canExport: boolean }) {
  return (
    <ImportPanel
      canImport={canImport}
      canExport={canExport}
      statusChoice={false}
      preview={previewRencanaImport}
      commit={(rows, { update }) => commitRencanaImport(rows, { update })}
      copy={{
        noun: "kegiatan",
        workbook: "Peta Rencana SPBE",
        sheet: "Peta Rencana",
        hint: "Periode diturunkan dari tahun bila kolom Periode kosong; muatan dan status dibaca dari labelnya (Aplikasi, Tata Kelola, Direncanakan, …).",
        template: "/templates/peta-rencana.xlsx",
        exportHref: "/api/export/peta-rencana",
        listHref: "/cms/peta-rencana",
      }}
      refColumn={{
        header: "Muatan · tahun",
        search: (r) => `${r.muatan ?? r.muatanRaw ?? ""} ${r.year ?? ""}`,
        cell: (r) => (
          <span className="grid gap-1">
            {r.muatan ? <ToneBadge tone={muatanConfig[r.muatan].tone}>{muatanConfig[r.muatan].label}</ToneBadge> : <span className="text-destructive">{r.muatanRaw ?? "—"}</span>}
            <span className="text-muted-foreground tabular-nums">{r.year ?? "—"}</span>
          </span>
        ),
      }}
    />
  );
}
