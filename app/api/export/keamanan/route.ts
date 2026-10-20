import * as XLSX from "xlsx";
import { can, currentActor } from "@/lib/access";
import { listKeamanan } from "@/lib/keamanan/cms-repo";
import { columnsFor } from "@/lib/keamanan/columns";
import { kegiatanKeys, sheetName } from "@/lib/keamanan/jenis";

/** Ekspor kegiatan keamanan: satu sheet per kegiatan dengan kolom template analis (+ periode & status). */
export async function GET() {
  const actor = await currentActor().catch(() => null);
  if (!actor || !can.export(actor)) return new Response("Tidak diizinkan", { status: 403 });
  const rows = await listKeamanan({ opdId: can.readAll(actor) ? null : (actor.opdId ?? "00000000-0000-0000-0000-000000000000") });
  const book = XLSX.utils.book_new();
  for (const jenis of kegiatanKeys) {
    const cols = columnsFor(jenis);
    const sheet = XLSX.utils.aoa_to_sheet([cols.map((c) => c.header), ...rows.filter((r) => r.jenis === jenis).map((r) => cols.map((c) => c.value(r)))]);
    sheet["!cols"] = cols.map((c) => ({ wch: c.width }));
    XLSX.utils.book_append_sheet(book, sheet, sheetName(jenis));
  }
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(XLSX.write(book, { type: "buffer", bookType: "xlsx" }), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="keamanan-${stamp}.xlsx"`,
    },
  });
}
