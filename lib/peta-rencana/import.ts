import * as XLSX from "xlsx";
import { matchPd, normalize, text } from "@/lib/probis/import";
import type { PeriodOptions } from "@/lib/probis/reference";
import { muatanFromLabel, sourceKeys, sourceLabel, statusFromLabel, type Muatan, type RencanaSource, type RencanaStatus } from "./muatan";

export type ImportIssue = { level: "error" | "warning"; message: string };
export type RencanaImportRow = {
  line: number;
  /** Unik per unggahan: "sheet:baris". */
  key: string;
  code: string | null;
  sasaran: string;
  inisiatif: string | null;
  muatan: Muatan | null;
  muatanRaw: string | null;
  program: string | null;
  name: string;
  opd: string | null;
  opdRaw: string | null;
  year: number | null;
  period: string;
  target: string | null;
  jumlah: number;
  satuan: string;
  status: RencanaStatus;
  statusRaw: string | null;
  realisasi: string | null;
  evaluasi: string | null;
  source: RencanaSource;
  sourceRef: string | null;
  issues: ImportIssue[];
};
export type RencanaImportResult = { file: string | null; unsupported: string[]; rows: RencanaImportRow[] };

type Raw = Omit<RencanaImportRow, "issues">;
type Field = "code" | "sasaran" | "inisiatif" | "muatan" | "program" | "name" | "opd" | "year" | "period" | "target" | "jumlah" | "satuan" | "status" | "realisasi" | "evaluasi" | "source" | "sourceRef";

/** Header (sudah dinormalisasi) → kolom. Urutan penting: "referensi asal" sebelum "asal usulan". */
const patterns: [Field, RegExp][] = [
  ["code", /^id$/],
  ["sasaran", /^sasaran/],
  ["inisiatif", /^inisiatif/],
  ["muatan", /^muatan/],
  ["program", /^program/],
  ["name", /^(nama )?kegiatan/],
  ["opd", /^(pd|perangkat daerah|instansi)/],
  ["year", /^tahun/],
  ["period", /^periode/],
  ["target", /^target/],
  ["jumlah", /^jumlah/],
  ["satuan", /^satuan/],
  ["status", /^status/],
  ["realisasi", /^realisasi/],
  ["evaluasi", /evaluasi/],
  ["sourceRef", /^referensi asal/],
  ["source", /^asal/],
];

const sourceFromLabel = (label: string | null) => sourceKeys.find((k) => sourceLabel[k].toLowerCase() === label?.trim().toLowerCase()) ?? "manual";

function parseSheet(sheet: XLSX.WorkSheet, source: string): Raw[] {
  const table = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false });
  const headIndex = table.slice(0, 3).findIndex((row) => row.some((c) => /^(nama )?kegiatan/.test(normalize(c))));
  if (headIndex < 0) return [];
  const map = new Map<Field, number>();
  table[headIndex]!.forEach((cell, i) => {
    const h = normalize(cell);
    const field = patterns.find(([, re]) => re.test(h))?.[0];
    if (field && !map.has(field)) map.set(field, i);
  });
  return table
    .slice(headIndex + 1)
    .map((cells, i) => {
      const get = (f: Field) => (map.has(f) ? cells[map.get(f)!] : undefined);
      const opdRaw = text(get("opd"));
      const muatanRaw = text(get("muatan"));
      const statusRaw = text(get("status"));
      const year = Number(text(get("year")));
      const period = text(get("period"));
      return {
        line: headIndex + i + 2,
        key: `${source}:${headIndex + i + 2}`,
        code: text(get("code")),
        sasaran: text(get("sasaran")) ?? "",
        inisiatif: text(get("inisiatif")),
        muatan: muatanRaw ? muatanFromLabel(muatanRaw) : null,
        muatanRaw,
        program: text(get("program")),
        name: text(get("name")) ?? "",
        opd: matchPd(opdRaw),
        opdRaw,
        year: Number.isInteger(year) && year > 2000 ? year : null,
        period: period ? period.replace(/\s*[-–—]\s*/, "–") : "",
        target: text(get("target")),
        jumlah: Number(String(text(get("jumlah")) ?? "1").replace(",", ".")) || 1,
        satuan: text(get("satuan")) ?? "Kegiatan",
        status: (statusRaw && statusFromLabel(statusRaw)) || "direncanakan",
        statusRaw,
        realisasi: text(get("realisasi")),
        evaluasi: text(get("evaluasi")),
        source: sourceFromLabel(text(get("source"))),
        sourceRef: text(get("sourceRef")),
      };
    })
    .filter((row) => row.name || row.code);
}

/** Validasi & normalisasi: PD dicocokkan, periode diturunkan dari tahun bila kosong, ID ganda ditandai. */
export function validateRows(rows: Raw[], { existing, periods }: { existing: Set<string>; periods: PeriodOptions }): RencanaImportRow[] {
  const seen = new Set<string>();
  const periodOf = (year: number) =>
    periods.periods.find((p) => {
      const [s, e] = p.split("–").map(Number);
      return year >= s! && year <= e!;
    });
  return rows.map((row) => {
    const issues: ImportIssue[] = [];
    const period = row.period || (row.year ? (periodOf(row.year) ?? "") : periods.active);
    if (!row.name || row.name.length < 3) issues.push({ level: "error", message: "Nama kegiatan kosong" });
    if (!row.sasaran) issues.push({ level: "error", message: "Sasaran kosong" });
    if (!row.muatan) issues.push({ level: "error", message: row.muatanRaw ? `Muatan “${row.muatanRaw}” tidak dikenal` : "Muatan kosong" });
    if (!row.year) issues.push({ level: "error", message: "Tahun kosong atau tidak valid" });
    if (!periods.periods.includes(period)) issues.push({ level: "error", message: period ? `Periode “${period}” belum terdaftar` : `Tidak ada periode untuk tahun ${row.year}` });
    else if (row.year && periodOf(row.year) !== period) issues.push({ level: "error", message: `Tahun ${row.year} di luar periode ${period}` });
    if (!row.opd) issues.push({ level: "error", message: row.opdRaw ? `Perangkat daerah “${row.opdRaw}” tidak dikenal` : "Perangkat daerah kosong" });
    if (row.statusRaw && !statusFromLabel(row.statusRaw)) issues.push({ level: "warning", message: `Status “${row.statusRaw}” tidak dikenal, diisi Direncanakan` });
    if (row.status === "terlaksana" && !row.realisasi) issues.push({ level: "error", message: "Kegiatan terlaksana wajib berisi realisasi" });
    if (row.code) {
      const key = `${row.code}|${period}`;
      if (seen.has(key)) issues.push({ level: "error", message: "ID ganda di dalam file" });
      else if (existing.has(key)) issues.push({ level: "warning", message: `ID sudah ada di periode ${period}` });
      seen.add(key);
    }
    return { ...row, period, issues };
  });
}

/** Baca unggahan .xlsx: setiap sheet berkolom "Kegiatan" dibaca (sheet Indikator dilewati). */
export function readUpload(name: string, data: Uint8Array) {
  if (!name.toLowerCase().endsWith(".xlsx")) throw new Error("Format berkas harus .xlsx");
  const book = XLSX.read(data, { type: "array" });
  const unsupported: string[] = [];
  const rows = book.SheetNames.flatMap((sheet) => {
    const parsed = parseSheet(book.Sheets[sheet]!, sheet);
    if (!parsed.length) unsupported.push(sheet);
    return parsed;
  });
  if (!rows.length) throw new Error("Tidak ada sheet berkolom “Kegiatan” di berkas ini.");
  return { file: name, unsupported, rows };
}
