"use client";
import { commitKeamananImport, previewKeamananImport } from "@/app/cms/keamanan/actions";
import { ImportPanel } from "@/components/cms/import-panel";
import { tanggalText } from "@/components/keamanan/kegiatan";
import { ToneBadge } from "@/components/blocks/status-badge";
import { kegiatanConfig } from "@/lib/keamanan/jenis";

/** Impor/ekspor 7 template Domain Arsitektur Keamanan: satu workbook kegiatan, workbook gabungan, atau zip folder Keamanan. */
export function KeamananImport({ canImport, canExport }: { canImport: boolean; canExport: boolean }) {
  return (
    <ImportPanel
      canImport={canImport}
      canExport={canExport}
      preview={previewKeamananImport}
      commit={commitKeamananImport}
      copy={{
        noun: "kegiatan",
        workbook: "Domain Arsitektur Keamanan",
        sheet: "kegiatan",
        hint: "Jenis kegiatan dikenali dari nama berkas/sheet; tanggal Excel maupun teks (12/03/2025, 12 Maret 2025) dibaca otomatis.",
        template: "/templates/keamanan.xlsx",
        exportHref: "/api/export/keamanan",
        listHref: "/cms/keamanan",
      }}
      refColumn={{
        header: "Kegiatan · tanggal",
        search: (r) => `${kegiatanConfig[r.jenis].label} ${r.tanggal ?? ""}`,
        cell: (r) => (
          <span className="grid gap-1">
            <ToneBadge tone={kegiatanConfig[r.jenis].tone}>{kegiatanConfig[r.jenis].short}</ToneBadge>
            <span className="text-muted-foreground">{tanggalText(r.tanggal)}</span>
          </span>
        ),
      }}
    />
  );
}
