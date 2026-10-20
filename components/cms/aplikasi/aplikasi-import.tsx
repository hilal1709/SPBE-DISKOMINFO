"use client";
import { commitAplikasiImport, previewAplikasiImport } from "@/app/cms/aplikasi/actions";
import { useRaaSet } from "@/components/aplikasi/raa-context";
import { ImportPanel } from "@/components/cms/import-panel";
import { Badge } from "@/components/ui/badge";
import { kepemilikanLabel, kepemilikanOf } from "@/lib/aplikasi/reference";

/** Impor/ekspor template Domain Arsitektur Aplikasi (template analis, 32 kolom). Zip berisi semua domain bisa langsung diunggah. */
export function AplikasiImport({ canImport, canExport }: { canImport: boolean; canExport: boolean }) {
  const raas = useRaaSet();
  return (
    <ImportPanel
      canImport={canImport}
      canExport={canExport}
      preview={previewAplikasiImport}
      commit={commitAplikasiImport}
      copy={{
        noun: "aplikasi",
        workbook: "Domain Arsitektur Aplikasi",
        sheet: "Aplikasi",
        hint: "RAA Level 1 dilengkapi dari Level 2; basis, lisensi, unit, proses bisnis tervalidasi, layanan, dan data dicocokkan otomatis.",
        template: "/templates/aplikasi.xlsx",
        exportHref: "/api/export/aplikasi",
        listHref: "/cms/aplikasi",
      }}
      refColumn={{
        header: "RAA · kepemilikan",
        search: (r) => `${r.raa ?? ""} ${r.pengembang ?? ""}`,
        cell: (r) => (
          <span className="grid gap-1">
            <span className="text-muted-foreground">{r.raa ? raas.forPeriod(r.period).label(r.raa) : "—"}</span>
            {r.pengembang && <Badge variant="muted">{kepemilikanLabel[kepemilikanOf(r.pengembang)]}</Badge>}
          </span>
        ),
      }}
    />
  );
}
