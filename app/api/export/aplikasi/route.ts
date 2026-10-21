import * as XLSX from "xlsx";
import { forbidden, xlsxResponse } from "@/lib/export/xlsx-response";
import { can, currentActor, opdScope } from "@/lib/access";
import { securityRefs } from "@/lib/keamanan/cms-repo";
import { withSecurityLabels } from "@/lib/keamanan/link";
import { listAplikasi } from "@/lib/aplikasi/cms-repo";
import { flowLabels } from "@/lib/aplikasi/data-flow";
import { raa } from "@/lib/aplikasi/raa";
import { basisLabel, lisensiLabel } from "@/lib/aplikasi/reference";
import { securityFields } from "@/lib/data/reference";
import { pdByCode, reviewLabel } from "@/lib/probis/reference";
import { refResolver } from "@/lib/reference/versioned";

/** Urutan kolom keamanan di template aplikasi (berbeda dengan template data). */
const securityOrder = ["standar", "audit", "peningkatan", "insiden", "edukasi", "kelaikan", "kerentanan"] as const;
const securityLabel = Object.fromEntries(securityFields.map((f) => [f.key, f.label]));

/** Ekspor aplikasi dalam format 32 kolom template "Domain Arsitektur Aplikasi.xlsx" (+ periode & status). */
export async function GET() {
  const actor = await currentActor().catch(() => null);
  if (!actor || !can.export(actor)) return forbidden();
  const [records, raaSet, refs] = await Promise.all([listAplikasi({ opdId: opdScope(actor) }), raa.loadSet(), securityRefs()]);
  // Dependensi keamanan tertaut diekspor sebagai "kode nama" agar terbaca dan bisa diimpor ulang.
  const rows = withSecurityLabels(records, refs);
  const raaFor = refResolver(raaSet);

  const security = securityOrder.map((key) => `← ${securityLabel[key]} (Dependency)`);
  const header = [
    "Nama Aplikasi", "ID", "Uraian Aplikasi", "Fungsi Aplikasi", "Luaran", "Mesin Basis Data", "Basis Aplikasi", "Tipe Lisensi Aplikasi", "Bahasa Pemrograman",
    "→ RAA Level 1 (Dependency)", "→ RAA Level 2 (Dependency)", "→ Layanan (Dependency)", "→ Data yang digunakan (Dependency)", "← Proses Bisnis (Dependency)",
    "← Inputan Data (Dependency)", "→ Supplier Data (Dependency)", "→ Luaran Data (Dependency)", "→ Customer Data (Dependency)", "→ Komputasi Awan (Dependency)",
    "→ Perangkat Keras Server (Dependency)", "→ Sistem Penghubung Layanan (Dependency)", "→ Jaringan Intra Pemerintah (Dependency)", "Kerangka Pengembangan",
    "← Unit Pengembang (Dependency)", "→ Unit Operasional Teknologi (Dependency)", ...security, "Periode", "Status Verifikasi",
  ];
  const links = (items: { id: string; name: string }[]) => items.map((p) => `${p.id} ${p.name}`).join("\n");
  const sheet = XLSX.utils.json_to_sheet(
    rows.map((r) => {
      // Nama referensi mengikuti versi milik periode aplikasi, format sel seperti template ("KODE NAMA").
      const index = raaFor(r.period);
      const cell = (code: string | null) => (code ? `${code} ${(index.byCode.get(code)?.name ?? "").toUpperCase()}`.trim() : "");
      return {
        "Nama Aplikasi": r.name,
        ID: r.code,
        "Uraian Aplikasi": r.uraian,
        "Fungsi Aplikasi": r.fungsi,
        Luaran: r.luaran,
        "Mesin Basis Data": r.mesin ?? "",
        "Basis Aplikasi": basisLabel[r.basis],
        "Tipe Lisensi Aplikasi": lisensiLabel[r.lisensi],
        "Bahasa Pemrograman": r.bahasa,
        "→ RAA Level 1 (Dependency)": cell(r.raa1),
        "→ RAA Level 2 (Dependency)": cell(r.raa2),
        "→ Layanan (Dependency)": links(r.layanan),
        "→ Data yang digunakan (Dependency)": links(r.data),
        "← Proses Bisnis (Dependency)": links(r.probis),
        "← Inputan Data (Dependency)": flowLabels(r.inputData, r.dataNames).join("\n"),
        "→ Supplier Data (Dependency)": r.supplier ?? "",
        "→ Luaran Data (Dependency)": flowLabels(r.outputData, r.dataNames).join("\n"),
        "→ Customer Data (Dependency)": r.customer ?? "",
        "→ Komputasi Awan (Dependency)": r.cloud ?? "",
        "→ Perangkat Keras Server (Dependency)": r.server ?? "",
        "→ Sistem Penghubung Layanan (Dependency)": r.splp ?? "",
        "→ Jaringan Intra Pemerintah (Dependency)": r.jip ?? "",
        "Kerangka Pengembangan": r.kerangka ?? "",
        "← Unit Pengembang (Dependency)": pdByCode.get(r.pengembang)?.name ?? r.pengembang,
        "→ Unit Operasional Teknologi (Dependency)": r.opdName,
        ...Object.fromEntries(securityOrder.map((key, i) => [security[i], (r.security[key] ?? []).join("\n")])),
        Periode: r.period,
        "Status Verifikasi": reviewLabel[r.status],
      };
    }),
    { header },
  );
  sheet["!cols"] = [32, 18, 44, 44, 30, 16, 12, 14, 16, 26, 36, 40, 40, 44, 28, 28, 28, 22, 22, 26, 22, 22, 16, 32, 32, 28, 28, 28, 28, 28, 28, 28, 12, 16].map((wch) => ({ wch }));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Aplikasi");
  return xlsxResponse(book, "aplikasi");
}
