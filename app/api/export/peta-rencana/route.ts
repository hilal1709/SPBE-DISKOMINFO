import * as XLSX from "xlsx";
import { forbidden, xlsxResponse } from "@/lib/export/xlsx-response";
import { can, currentActor } from "@/lib/access";
import { listIndicatorsCms, listRencana } from "@/lib/peta-rencana/cms-repo";
import { indicatorColumns, rencanaColumns, type Column } from "@/lib/peta-rencana/columns";

/** Ekspor Peta Rencana: sheet kegiatan (format tabel peta rencana + evaluasi & realisasi) dan sheet indikator & target. */
export async function GET() {
  const actor = await currentActor().catch(() => null);
  if (!actor || !can.export(actor)) return forbidden();
  const [rows, indicators] = await Promise.all([listRencana(), listIndicatorsCms()]);
  const book = XLSX.utils.book_new();
  const sheet = <R,>(cols: Column<R>[], data: R[], name: string) => {
    const ws = XLSX.utils.aoa_to_sheet([cols.map((c) => c.header), ...data.map((r) => cols.map((c) => c.value(r)))]);
    ws["!cols"] = cols.map((c) => ({ wch: c.width }));
    XLSX.utils.book_append_sheet(book, ws, name);
  };
  sheet(rencanaColumns, rows, "Peta Rencana");
  sheet(indicatorColumns([...new Set(indicators.flatMap((i) => Object.keys(i.targets)))].sort()), indicators, "Indikator");
  return xlsxResponse(book, "peta-rencana");
}
