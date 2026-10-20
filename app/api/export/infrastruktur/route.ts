import * as XLSX from "xlsx";
import { can, currentActor } from "@/lib/access";
import { securityRefs } from "@/lib/keamanan/cms-repo";
import { withSecurityLabels } from "@/lib/keamanan/link";
import { listInfrastruktur } from "@/lib/infrastruktur/cms-repo";
import { columnsFor } from "@/lib/infrastruktur/columns";
import { jenisKeys, sheetName } from "@/lib/infrastruktur/jenis";
import { rai } from "@/lib/infrastruktur/rai";
import { refResolver } from "@/lib/reference/versioned";

/** Ekspor komponen infrastruktur: satu sheet per komponen dengan kolom template analis (+ periode & status). */
export async function GET() {
  const actor = await currentActor().catch(() => null);
  if (!actor || !can.export(actor)) return new Response("Tidak diizinkan", { status: 403 });
  const [records, raiSet, refs] = await Promise.all([listInfrastruktur({ opdId: can.readAll(actor) ? null : (actor.opdId ?? "00000000-0000-0000-0000-000000000000") }), rai.loadSet(), securityRefs()]);
  // Dependensi keamanan tertaut diekspor sebagai "kode nama" agar terbaca dan bisa diimpor ulang.
  const rows = withSecurityLabels(records, refs);
  const raiFor = refResolver(raiSet);

  const book = XLSX.utils.book_new();
  for (const jenis of jenisKeys) {
    const cols = columnsFor(jenis);
    // Nama referensi mengikuti versi RAI milik periode masing-masing komponen.
    const data = rows.filter((r) => r.jenis === jenis).map((r) => cols.map((c) => c.value(r, raiFor(r.period))));
    const sheet = XLSX.utils.aoa_to_sheet([cols.map((c) => c.header), ...data]);
    sheet["!cols"] = cols.map((c) => ({ wch: c.width }));
    XLSX.utils.book_append_sheet(book, sheet, sheetName(jenis));
  }
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(XLSX.write(book, { type: "buffer", bookType: "xlsx" }), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="infrastruktur-${stamp}.xlsx"`,
    },
  });
}
