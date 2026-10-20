// Template gabungan Domain Arsitektur Keamanan: satu sheet per kegiatan (kolom sama dengan ekspor CMS).
// Jalankan: pnpm template:keamanan  → menulis public/templates/keamanan.xlsx
// Template asli analis (satu workbook per kegiatan) tetap ada di public/templates/keamanan/.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import * as XLSX from "xlsx";
import { columnsFor } from "@/lib/keamanan/columns";
import { kegiatanKeys, sheetName } from "@/lib/keamanan/jenis";

const book = XLSX.utils.book_new();
for (const jenis of kegiatanKeys) {
  const cols = columnsFor(jenis, { status: false });
  const sheet = XLSX.utils.aoa_to_sheet([cols.map((c) => c.header)]);
  sheet["!cols"] = cols.map((c) => ({ wch: c.width }));
  XLSX.utils.book_append_sheet(book, sheet, sheetName(jenis));
}
const out = join(import.meta.dirname, "../public/templates/keamanan.xlsx");
writeFileSync(out, XLSX.write(book, { type: "buffer", bookType: "xlsx" }));
console.log(`Template ditulis: ${out}`);
