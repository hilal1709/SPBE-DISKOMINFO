import * as XLSX from "xlsx";

/** Unduhan Excel `<nama>-YYYY-MM-DD.xlsx` dari workbook yang sudah disusun. */
export function xlsxResponse(book: XLSX.WorkBook, name: string) {
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(XLSX.write(book, { type: "buffer", bookType: "xlsx" }), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${name}-${stamp}.xlsx"`,
    },
  });
}

/** Ekspor ditolak: pengguna tidak punya hak ekspor. */
export const forbidden = () => new Response("Tidak diizinkan", { status: 403 });
