import * as XLSX from "xlsx";
import { forbidden, xlsxResponse } from "@/lib/export/xlsx-response";
import { can, currentActor, opdScope } from "@/lib/access";
import { listIndicatorsCms, listRencana } from "@/lib/peta-rencana/cms-repo";
import { muatanBookSafe } from "@/lib/peta-rencana/muatan-repo";
import { indicatorColumns, rencanaColumns, type Column } from "@/lib/peta-rencana/columns";

/** Ekspor Peta Rencana: sheet kegiatan (format tabel peta rencana + evaluasi & realisasi) dan sheet indikator & target. */
export async function GET() {
  const actor = await currentActor().catch(() => null);
  if (!actor || !can.export(actor)) return forbidden();
  const [all, indicators] = await Promise.all([listRencana(), listIndicatorsCms()]);
  // B17: Operator OPD boleh melihat rencana semua OPD di CMS, tetapi ekspor hanya kegiatan OPD-nya sendiri.
  const scope = opdScope(actor);
  const rows = scope ? all.filter((r) => r.opdId === scope) : all;
  const book = XLSX.utils.book_new();
  const sheet = <R,>(cols: Column<R>[], data: R[], name: string) => {
    const ws = XLSX.utils.aoa_to_sheet([cols.map((c) => c.header), ...data.map((r) => cols.map((c) => c.value(r)))]);
    ws["!cols"] = cols.map((c) => ({ wch: c.width }));
    XLSX.utils.book_append_sheet(book, ws, name);
  };
  sheet(rencanaColumns(await muatanBookSafe()), rows, "Peta Rencana");
  sheet(indicatorColumns([...new Set(indicators.flatMap((i) => Object.keys(i.targets)))].sort()), indicators, "Indikator");
  return xlsxResponse(book, "peta-rencana");
}
