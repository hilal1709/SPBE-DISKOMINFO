import * as XLSX from "xlsx";
import { can, currentActor } from "@/lib/access";
import { listLayanan } from "@/lib/layanan/cms-repo";
import { ral } from "@/lib/layanan/ral";
import { metodeLabel, targetLabel } from "@/lib/layanan/reference";
import { rab } from "@/lib/probis/rab";
import { reviewLabel } from "@/lib/probis/reference";
import { refResolver } from "@/lib/reference/versioned";

/** Ekspor layanan dalam format kolom template "Domain Arsitektur Layanan.xlsx" (+ periode & status). */
export async function GET() {
  const actor = await currentActor().catch(() => null);
  if (!actor || !can.export(actor)) return new Response("Tidak diizinkan", { status: 403 });
  const [rows, ralSet, rabSet] = await Promise.all([listLayanan({ opdId: can.readAll(actor) ? null : (actor.opdId ?? "00000000-0000-0000-0000-000000000000") }), ral.loadSet(), rab.loadSet()]);
  const ralFor = refResolver(ralSet);
  const rabFor = refResolver(rabSet);

  const header = [
    "Nama Layanan", "ID", "Tujuan Layanan", "Fungsi Layanan", "Urusan Pemerintahan → RAB Level 2", "→ Target Layanan", "Potensi Manfaat", "Potensi Ekonomi",
    "→ RAL Level 4 (Dependency)", "→ RAL Level 5 (Dependency)", "Metode Layanan", "→ Kementerian/Lembaga Terkait (Dependency)",
    "→ RAL Level 1 (Dependency)", "→ RAL Level 2 (Dependency)", "→ RAL Level 3 (Dependency)", "Unit Pelaksana → Unit Kerja (Dependency)",
    "Potensi Resiko", "Mitigasi Resiko", "← Proses Bisnis (Dependency)", "Periode", "Status Verifikasi",
  ];
  const sheet = XLSX.utils.json_to_sheet(
    rows.map((r) => {
      // Nama referensi mengikuti versi milik periode layanan, format sel seperti template ("KODE NAMA").
      const ralIndex = ralFor(r.period);
      const rabIndex = rabFor(r.period);
      const cell = (index: typeof ralIndex, code: string | null) => (code ? `${code} ${(index.byCode.get(code)?.name ?? "").toUpperCase()}`.trim() : "");
      const deep = (code: string | null) => (ralIndex.byCode.has(code ?? "") ? cell(ralIndex, code) : (code ?? ""));
      return {
        "Nama Layanan": r.name,
        ID: r.code,
        "Tujuan Layanan": r.tujuan,
        "Fungsi Layanan": r.fungsi ?? "",
        "Urusan Pemerintahan → RAB Level 2": cell(rabIndex, r.rab2),
        "→ Target Layanan": targetLabel[r.target],
        "Potensi Manfaat": r.manfaat ?? "",
        "Potensi Ekonomi": r.ekonomi ?? "",
        "→ RAL Level 4 (Dependency)": deep(r.ralL4),
        "→ RAL Level 5 (Dependency)": deep(r.ralL5),
        "Metode Layanan": metodeLabel[r.metode],
        "→ Kementerian/Lembaga Terkait (Dependency)": r.kl ?? "",
        "→ RAL Level 1 (Dependency)": cell(ralIndex, r.ral1),
        "→ RAL Level 2 (Dependency)": cell(ralIndex, r.ral2),
        "→ RAL Level 3 (Dependency)": cell(ralIndex, r.ral3),
        "Unit Pelaksana → Unit Kerja (Dependency)": r.opdName,
        "Potensi Resiko": r.risiko ?? "",
        "Mitigasi Resiko": r.mitigasi ?? "",
        "← Proses Bisnis (Dependency)": r.probis.map((p) => `${p.id} ${p.name}`).join("\n"),
        Periode: r.period,
        "Status Verifikasi": reviewLabel[r.status],
      };
    }),
    { header },
  );
  sheet["!cols"] = [36, 22, 46, 40, 30, 16, 36, 36, 18, 18, 14, 28, 30, 30, 40, 32, 30, 30, 44, 12, 16].map((wch) => ({ wch }));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Layanan");
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(XLSX.write(book, { type: "buffer", bookType: "xlsx" }), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="layanan-${stamp}.xlsx"`,
    },
  });
}
