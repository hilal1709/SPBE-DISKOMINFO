import * as XLSX from "xlsx";
import { forbidden, xlsxResponse } from "@/lib/export/xlsx-response";
import { can, currentActor, opdScope } from "@/lib/access";
import { securityRefs } from "@/lib/keamanan/cms-repo";
import { withSecurityLabels } from "@/lib/keamanan/link";
import { listInfrastruktur } from "@/lib/infrastruktur/cms-repo";
import { columnsFor } from "@/lib/infrastruktur/columns";
import { jenisKeys, sheetName } from "@/lib/infrastruktur/jenis";
import { rai } from "@/lib/infrastruktur/rai";
import { refResolver } from "@/lib/reference/versioned";

/** Ekspor komponen infrastruktur: satu sheet per komponen dengan kolom template analis (+ periode & status). */
export async function GET() {
  const actor = await currentActor().catch(() => null);
  if (!actor || !can.export(actor)) return forbidden();
  const [records, raiSet, refs] = await Promise.all([listInfrastruktur({ opdId: opdScope(actor) }), rai.loadSet(), securityRefs()]);
  // Dependensi keamanan tertaut diekspor sebagai "kode nama" agar terbaca dan bisa diimpor ulang.
  const rows = withSecurityLabels(records, refs);
  const raiFor = refResolver(raiSet);

  const book = XLSX.utils.book_new();
  for (const jenis of jenisKeys) {
    const cols = columnsFor(jenis);
    // Nama referensi mengikuti versi RAI milik periode masing-masing komponen.
    const data = rows.filter((r) => r.jenis === jenis).map((r) => cols.map((c) => c.value(r, raiFor(r.period))));
    const sheet = XLSX.utils.aoa_to_sheet([cols.map((c) => c.header), ...data]);
    sheet["!cols"] = cols.map((c) => ({ wch: c.width }));
    XLSX.utils.book_append_sheet(book, sheet, sheetName(jenis));
  }
  return xlsxResponse(book, "infrastruktur");
}
