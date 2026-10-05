import * as XLSX from "xlsx";
import { can, currentActor } from "@/lib/access";
import { listData } from "@/lib/data/cms-repo";
import { rad } from "@/lib/data/rad";
import { jenisLabel, securityFields, sifatLabel } from "@/lib/data/reference";
import { pdByCode, reviewLabel } from "@/lib/probis/reference";
import { refResolver } from "@/lib/reference/versioned";

/** Ekspor data dalam format kolom template "Domain Arsitektur Data dan Informasi.xlsx" (+ periode & status). */
export async function GET() {
  const actor = await currentActor().catch(() => null);
  if (!actor || !can.export(actor)) return new Response("Tidak diizinkan", { status: 403 });
  const [rows, radSet] = await Promise.all([listData({ opdId: can.readAll(actor) ? null : (actor.opdId ?? "00000000-0000-0000-0000-000000000000") }), rad.loadSet()]);
  const radFor = refResolver(radSet);

  const security = securityFields.map((f) => `← ${f.label} (Dependency)`);
  const header = [
    "Nama Data", "ID", "Uraian Data", "Tujuan Data", "← Penghasil Data/Produsen Data", "→ Penanggung Jawab Data/ Wali Data (Dependency)",
    "Informasi yang Terkait (Output)", "Informasi yang Terkait (Input)", "→ RAD Level 4 (Dependency)", "Sifat Data", "Jenis Data", "Validitas Data",
    "Interoperabilitas", "→ RAD Level 1 (Dependency)", "→ RAD Level 2 (Dependency)", "→ RAD Level 3 (Dependency)", "← Proses Bisnis (Dependency)",
    "→ Layanan (Dependency)", ...security, "Periode", "Status Verifikasi",
  ];
  const sheet = XLSX.utils.json_to_sheet(
    rows.map((r) => {
      // Nama referensi mengikuti versi milik periode data, format sel seperti template ("KODE NAMA").
      const index = radFor(r.period);
      const cell = (code: string | null) => (code ? `${code} ${(index.byCode.get(code)?.name ?? "").toUpperCase()}`.trim() : "");
      return {
        "Nama Data": r.name,
        ID: r.code,
        "Uraian Data": r.uraian,
        "Tujuan Data": r.tujuan,
        "← Penghasil Data/Produsen Data": r.produsen ? (pdByCode.get(r.produsen)?.name ?? r.produsen) : "",
        "→ Penanggung Jawab Data/ Wali Data (Dependency)": r.opdName,
        "Informasi yang Terkait (Output)": r.output ?? "",
        "Informasi yang Terkait (Input)": r.input ?? "",
        "→ RAD Level 4 (Dependency)": index.byCode.has(r.radL4 ?? "") ? cell(r.radL4) : (r.radL4 ?? ""),
        "Sifat Data": sifatLabel[r.sifat],
        "Jenis Data": `Data ${jenisLabel[r.jenis]}`,
        "Validitas Data": r.validitas,
        Interoperabilitas: r.interoperabel ? "Ya" : "Tidak",
        "→ RAD Level 1 (Dependency)": cell(r.rad1),
        "→ RAD Level 2 (Dependency)": cell(r.rad2),
        "→ RAD Level 3 (Dependency)": cell(r.rad3),
        "← Proses Bisnis (Dependency)": r.probis.map((p) => `${p.id} ${p.name}`).join("\n"),
        "→ Layanan (Dependency)": r.layanan.map((l) => `${l.id} ${l.name}`).join("\n"),
        ...Object.fromEntries(securityFields.map((f, i) => [security[i], (r.security[f.key] ?? []).join("\n")])),
        Periode: r.period,
        "Status Verifikasi": reviewLabel[r.status],
      };
    }),
    { header },
  );
  sheet["!cols"] = [36, 22, 46, 40, 30, 32, 30, 30, 18, 12, 16, 14, 14, 30, 30, 40, 44, 44, 28, 28, 28, 28, 28, 28, 28, 12, 16].map((wch) => ({ wch }));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Data dan Informasi");
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(XLSX.write(book, { type: "buffer", bookType: "xlsx" }), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="data-${stamp}.xlsx"`,
    },
  });
}
