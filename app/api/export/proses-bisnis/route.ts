import * as XLSX from "xlsx";
import { can, currentActor } from "@/lib/access";
import { listProbis } from "@/lib/probis/repo";
import { loadRabSet, rabResolver } from "@/lib/probis/rab";
import { reviewLabel, statusLabel } from "@/lib/probis/reference";

/** Ekspor probis dalam format kolom template "Domain Arsitektur Proses Bisnis.xlsx" (+ status & periode). */
export async function GET() {
  const actor = await currentActor().catch(() => null);
  if (!actor || !can.export(actor)) return new Response("Tidak diizinkan", { status: 403 });
  const rows = await listProbis({ opdId: can.readAll(actor) ? null : actor.opdId ?? "00000000-0000-0000-0000-000000000000" });
  const rabFor = rabResolver(await loadRabSet());

  const header = [
    "Nama Bisnis/Urusan", "ID", "Uraian Bisnis/Urusan", "→ Unit Kerja (Dependency)", "→ RAB Level 4 (Dependency)", "→ RAB Level 5 (Dependency)",
    "Sasaran Strategis", "Indikator Kinerja Utama (IKU)", "Nilai IKU Target", "Nilai IKU Terealisasi",
    "→ RAB Level 1 Nasional (Dependency)", "→ RAB Level 2 (Dependency)", "→ RAB Level 3 (Dependency)", "Status Probis", "Periode", "Status Verifikasi",
  ];
  const sheet = XLSX.utils.json_to_sheet(
    rows.map((r) => {
      // Nama RAB mengikuti versi RAB periode probis, format sel seperti template ("KODE NAMA").
      const index = rabFor(r.period);
      const rab = (code: string | null) => (code ? `${code} ${(index.byCode.get(code)?.name ?? "").toUpperCase()}`.trim() : "");
      return {
      "Nama Bisnis/Urusan": r.name,
      ID: r.code,
      "Uraian Bisnis/Urusan": r.description ?? "",
      "→ Unit Kerja (Dependency)": r.opdName,
      "→ RAB Level 4 (Dependency)": index.byCode.has(r.rabL4 ?? "") ? rab(r.rabL4) : r.rabL4 ?? "",
      "→ RAB Level 5 (Dependency)": index.byCode.has(r.rabL5 ?? "") ? rab(r.rabL5) : r.rabL5 ?? "",
      "Sasaran Strategis": r.strategicGoal ?? "",
      "Indikator Kinerja Utama (IKU)": r.iku ?? "",
      "Nilai IKU Target": r.ikuTarget ?? "",
      "Nilai IKU Terealisasi": r.ikuRealization ?? "",
      "→ RAB Level 1 Nasional (Dependency)": rab(r.rab1),
      "→ RAB Level 2 (Dependency)": rab(r.rab2),
      "→ RAB Level 3 (Dependency)": rab(r.rab3),
      "Status Probis": statusLabel[r.probisStatus],
      Periode: r.period,
      "Status Verifikasi": reviewLabel[r.status],
      };
    }),
    { header },
  );
  sheet["!cols"] = [40, 22, 50, 32, 18, 18, 40, 30, 14, 14, 30, 30, 40, 12, 12, 16].map((wch) => ({ wch }));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Proses Bisnis");
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(XLSX.write(book, { type: "buffer", bookType: "xlsx" }), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="proses-bisnis-${stamp}.xlsx"`,
    },
  });
}
