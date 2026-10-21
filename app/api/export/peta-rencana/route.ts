import * as XLSX from "xlsx";
import { can, currentActor } from "@/lib/access";
import { listIndicatorsCms, listRencana } from "@/lib/peta-rencana/cms-repo";
import { indicatorColumns, rencanaColumns, type Column } from "@/lib/peta-rencana/columns";

/** Ekspor Peta Rencana: sheet kegiatan (format tabel peta rencana + evaluasi & realisasi) dan sheet indikator & target. */
export async function GET() {
  const actor = await currentActor().catch(() => null);
  if (!actor || !can.export(actor)) return new Response("Tidak diizinkan", { status: 403 });
  const [rows, indicators] = await Promise.all([listRencana(), listIndicatorsCms()]);
  const book = XLSX.utils.book_new();
  const sheet = <R,>(cols: Column<R>[], data: R[], name: string) => {
    const ws = XLSX.utils.aoa_to_sheet([cols.map((c) => c.header), ...data.map((r) => cols.map((c) => c.value(r)))]);
    ws["!cols"] = cols.map((c) => ({ wch: c.width }));
    XLSX.utils.book_append_sheet(book, ws, name);
  };
  sheet(rencanaColumns, rows, "Peta Rencana");
  sheet(indicatorColumns([...new Set(indicators.flatMap((i) => Object.keys(i.targets)))].sort()), indicators, "Indikator");
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(XLSX.write(book, { type: "buffer", bookType: "xlsx" }), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="peta-rencana-${stamp}.xlsx"`,
    },
  });
}
