import * as XLSX from "xlsx";
import { forbidden, xlsxResponse } from "@/lib/export/xlsx-response";
import { can, currentActor, opdScope } from "@/lib/access";
import { listKeamanan } from "@/lib/keamanan/cms-repo";
import { columnsFor } from "@/lib/keamanan/columns";
import { kegiatanKeys, sheetName } from "@/lib/keamanan/jenis";

/** Ekspor kegiatan keamanan: satu sheet per kegiatan dengan kolom template analis (+ periode & status). */
export async function GET() {
  const actor = await currentActor().catch(() => null);
  // Lintas OPD hanya untuk pemegang akses Dashboard Keamanan; operator OPD tetap bisa mengekspor isian OPD-nya.
  if (!actor || !can.export(actor) || (opdScope(actor) === null && !can.viewKeamanan(actor))) return forbidden();
  const rows = await listKeamanan({ opdId: opdScope(actor) });
  const book = XLSX.utils.book_new();
  for (const jenis of kegiatanKeys) {
    const cols = columnsFor(jenis);
    const sheet = XLSX.utils.aoa_to_sheet([cols.map((c) => c.header), ...rows.filter((r) => r.jenis === jenis).map((r) => cols.map((c) => c.value(r)))]);
    sheet["!cols"] = cols.map((c) => ({ wch: c.width }));
    XLSX.utils.book_append_sheet(book, sheet, sheetName(jenis));
  }
  return xlsxResponse(book, "keamanan");
}
