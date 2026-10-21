import * as XLSX from "xlsx";
import { forbidden, xlsxResponse } from "@/lib/export/xlsx-response";
import { can, currentActor } from "@/lib/access";
import { listGaps } from "@/lib/gap/cms-repo";
import { gapColumns } from "@/lib/gap/columns";

/** Ekspor seluruh temuan Gap Analysis (semua periode). */
export async function GET() {
  const actor = await currentActor().catch(() => null);
  if (!actor || !can.export(actor) || !can.viewGap(actor)) return forbidden();
  const rows = await listGaps();
  const book = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([gapColumns.map((c) => c.header), ...rows.map((r) => gapColumns.map((c) => c.value(r)))]);
  sheet["!cols"] = gapColumns.map((c) => ({ wch: c.width }));
  XLSX.utils.book_append_sheet(book, sheet, "Gap Analysis");
  return xlsxResponse(book, "gap-analysis");
}
