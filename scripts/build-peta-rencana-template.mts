// Template impor Peta Rencana: sheet kegiatan (kolom sama dengan ekspor CMS) + sheet indikator.
// Jalankan: pnpm template:peta-rencana  → menulis public/templates/peta-rencana.xlsx
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import * as XLSX from "xlsx";
import { indicatorColumns, rencanaColumns } from "@/lib/peta-rencana/columns";
import { sampleActivePeriod } from "@/lib/probis/reference";
import { yearsOf } from "@/lib/peta-rencana/query";

const book = XLSX.utils.book_new();
const sheet = (cols: { header: string; width: number }[], name: string) => {
  const ws = XLSX.utils.aoa_to_sheet([cols.map((c) => c.header)]);
  ws["!cols"] = cols.map((c) => ({ wch: c.width }));
  XLSX.utils.book_append_sheet(book, ws, name);
};
sheet(rencanaColumns.filter((c) => c.header !== "Asal Usulan" && c.header !== "Referensi Asal"), "Peta Rencana");
sheet(indicatorColumns(yearsOf(sampleActivePeriod)), "Indikator");
const out = join(import.meta.dirname, "../public/templates/peta-rencana.xlsx");
writeFileSync(out, XLSX.write(book, { type: "buffer", bookType: "xlsx" }));
console.log(`Template ditulis: ${out}`);
