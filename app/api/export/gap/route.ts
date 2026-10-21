import * as XLSX from "xlsx";
import { can, currentActor } from "@/lib/access";
import { listGaps } from "@/lib/gap/cms-repo";
import { gapColumns } from "@/lib/gap/columns";

/** Ekspor seluruh temuan Gap Analysis (semua periode). */
export async function GET() {
  const actor = await currentActor().catch(() => null);
  if (!actor || !can.export(actor) || !can.viewGap(actor)) return new Response("Tidak diizinkan", { status: 403 });
  const rows = await listGaps();
  const book = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([gapColumns.map((c) => c.header), ...rows.map((r) => gapColumns.map((c) => c.value(r)))]);
  sheet["!cols"] = gapColumns.map((c) => ({ wch: c.width }));
  XLSX.utils.book_append_sheet(book, sheet, "Gap Analysis");
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(XLSX.write(book, { type: "buffer", bookType: "xlsx" }), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="gap-analysis-${stamp}.xlsx"`,
    },
  });
}
