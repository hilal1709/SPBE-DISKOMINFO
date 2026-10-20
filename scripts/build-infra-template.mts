// Template gabungan Domain Arsitektur Infrastruktur: satu sheet per komponen (kolom sama dengan ekspor CMS) + referensi RAI.
// Jalankan: pnpm template:infrastruktur  → menulis public/templates/infrastruktur.xlsx
// Template asli analis (satu workbook per komponen) tetap ada di public/templates/infrastruktur/.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import * as XLSX from "xlsx";
import { columnsFor } from "@/lib/infrastruktur/columns";
import { jenisKeys, sheetName } from "@/lib/infrastruktur/jenis";
import { sampleRai } from "@/lib/infrastruktur/reference";

const book = XLSX.utils.book_new();
for (const jenis of jenisKeys) {
  const cols = columnsFor(jenis, { status: false });
  const sheet = XLSX.utils.aoa_to_sheet([cols.map((c) => c.header)]);
  sheet["!cols"] = cols.map((c) => ({ wch: c.width }));
  XLSX.utils.book_append_sheet(book, sheet, sheetName(jenis));
}
for (const level of [1, 2] as const) {
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(sampleRai.level(level).map((n) => [`${n.code} ${n.name.toUpperCase()}`])), `RAI Level ${level}`);
}
const out = join(import.meta.dirname, "../public/templates/infrastruktur.xlsx");
writeFileSync(out, XLSX.write(book, { type: "buffer", bookType: "xlsx" }));
console.log(`Template ditulis: ${out}`);
