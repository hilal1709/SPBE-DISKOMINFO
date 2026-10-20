import { unzipSync } from "fflate";
import * as XLSX from "xlsx";
import { matchPd, normalize, text } from "@/lib/probis/import";
import type { PeriodOptions } from "@/lib/probis/reference";
import { kegiatanConfig, kegiatanFromName, type Kegiatan } from "./jenis";

export type ImportIssue = { level: "error" | "warning"; message: string };
export type KeamananImportRow = {
  line: number;
  /** Unik per unggahan: "sheet:baris". */
  key: string;
  source: string;
  jenis: Kegiatan;
  code: string | null;
  name: string;
  deskripsi: string | null;
  tanggal: string | null;
  tanggalRaw: string | null;
  atribut: Record<string, string>;
  opd: string | null;
  opdRaw: string | null;
  period: string;
  issues: ImportIssue[];
};
export type KeamananImportResult = { file: string | null; unsupported: string[]; rows: KeamananImportRow[] };

type Raw = Omit<KeamananImportRow, "issues">;
type Field = "name" | "code" | "deskripsi" | "tanggal" | "opd" | "periode" | `attr:${string}`;

const months = ["januari", "februari", "maret", "april", "mei", "juni", "juli", "agustus", "september", "oktober", "november", "desember"];
const pad = (n: number) => String(n).padStart(2, "0");

/** Sel tanggal: serial Excel, "2025-03-12", "12/03/2025", atau "12 Maret 2025" → YYYY-MM-DD; null bila tidak terbaca. */
export function toDate(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") {
    const d = XLSX.SSF.parse_date_code(value);
    return d ? `${d.y}-${pad(d.m)}-${pad(d.d)}` : null;
  }
  const v = String(value).trim().toLowerCase();
  let m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${pad(+m[2]!)}-${pad(+m[3]!)}`;
  m = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) return `${m[3]}-${pad(+m[2]!)}-${pad(+m[1]!)}`;
  m = v.match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/);
  const month = m ? months.findIndex((x) => x.startsWith(m![2]!.slice(0, 3))) : -1;
  return m && month >= 0 ? `${m[3]}-${pad(month + 1)}-${pad(+m[1]!)}` : null;
}

function fieldOf(header: string, jenis: Kegiatan): Field | null {
  const h = header.replace(/\((dependency|function|information)\)/g, "").trim();
  if (/^nama/.test(h)) return "name";
  if (/^id$/.test(h)) return "code";
  const attr = kegiatanConfig[jenis].attrs.find((a) => a.match.test(h));
  if (attr) return `attr:${attr.key}`;
  if (/^deskripsi/.test(h)) return "deskripsi";
  if (/^tanggal/.test(h)) return "tanggal";
  if (/^instansi|perangkat daerah/.test(h)) return "opd";
  if (/^periode/.test(h)) return "periode";
  return null;
}

function parseSheet(sheet: XLSX.WorkSheet, source: string, fallback: Kegiatan | null): Raw[] {
  const table = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false });
  const headIndex = table.slice(0, 3).findIndex((row) => row.some((cell) => /^nama\b/.test(normalize(cell))));
  if (headIndex < 0) return [];
  const head = table[headIndex]!;
  const marker = head.map((c) => String(c ?? "")).find((c) => /^component:/i.test(c));
  const jenis = (marker && kegiatanFromName(marker.slice(10))) || kegiatanFromName(source) || fallback;
  if (!jenis) return [];
  const map = new Map<number, Field>();
  head.forEach((cell, i) => {
    const field = fieldOf(normalize(cell), jenis);
    if (field && ![...map.values()].includes(field)) map.set(i, field);
  });
  const cfg = kegiatanConfig[jenis];
  return table
    .slice(headIndex + 1)
    .map((cells, i) => {
      const get = (field: Field) => {
        for (const [col, f] of map) if (f === field) return cells[col];
        return undefined;
      };
      const opdRaw = text(get("opd"));
      const period = text(get("periode"));
      const rawDate = get("tanggal");
      return {
        line: headIndex + i + 2,
        key: `${source}:${headIndex + i + 2}`,
        source,
        jenis,
        code: text(get("code")),
        name: text(get("name")) ?? "",
        deskripsi: text(get("deskripsi")),
        tanggal: toDate(rawDate),
        tanggalRaw: text(rawDate),
        atribut: Object.fromEntries(
          cfg.attrs
            .map((a) => {
              const value = get(`attr:${a.key}`);
              return [a.key, a.type === "date" ? (toDate(value) ?? text(value)) : text(value)] as const;
            })
            .filter((e): e is readonly [string, string] => !!e[1]),
        ),
        opd: matchPd(opdRaw),
        opdRaw,
        period: period ? period.replace(/\s*[-–—]\s*/, "–") : "",
      };
    })
    .filter((row) => row.name || row.code);
}

const parseBook = (data: Uint8Array, file: string) => {
  const book = XLSX.read(data, { type: "array" });
  return book.SheetNames.flatMap((name) => parseSheet(book.Sheets[name]!, name, kegiatanFromName(file)));
};

/** Validasi & normalisasi: instansi dicocokkan, tanggal & nilai kematangan diperiksa, ID ganda ditandai. */
export function validateRows(rows: Raw[], { existing, lockedOpd, periods }: { existing: Set<string>; lockedOpd: string | null; periods: PeriodOptions }): KeamananImportRow[] {
  const seen = new Set<string>();
  return rows.map((row) => {
    const issues: ImportIssue[] = [];
    const next = { ...row, atribut: { ...row.atribut }, period: row.period || periods.active };
    if (!periods.periods.includes(next.period)) issues.push({ level: "error", message: `Periode “${next.period}” belum terdaftar` });
    if (!row.name || row.name.length < 3) issues.push({ level: "error", message: "Nama kegiatan kosong" });
    if (row.tanggalRaw && !row.tanggal) issues.push({ level: "warning", message: `Tanggal “${row.tanggalRaw}” tidak terbaca, dikosongkan` });
    for (const a of kegiatanConfig[row.jenis].attrs) {
      const value = row.atribut[a.key];
      if (!value) continue;
      if (a.type === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        issues.push({ level: "warning", message: `${a.label} “${value}” tidak terbaca, dikosongkan` });
        delete next.atribut[a.key];
      }
      if (a.type === "score" && !(Number(value.replace(",", ".")) >= 0 && Number(value.replace(",", ".")) <= 5)) {
        issues.push({ level: "warning", message: `${a.label} “${value}” bukan angka 0–5, dikosongkan` });
        delete next.atribut[a.key];
      }
    }
    if (lockedOpd) {
      if (row.opd && row.opd !== lockedOpd) issues.push({ level: "error", message: "Instansi berbeda dengan OPD akun Anda" });
      else if (!row.opd) issues.push({ level: "warning", message: "Instansi diisi OPD akun Anda" });
      next.opd = lockedOpd;
    } else if (!row.opd) {
      issues.push({ level: "error", message: row.opdRaw ? `Instansi “${row.opdRaw}” tidak dikenal` : "Instansi kosong" });
    }
    if (row.code) {
      if (seen.has(`${row.code}|${next.period}`)) issues.push({ level: "error", message: "ID ganda di dalam file" });
      else if (existing.has(`${row.code}|${next.period}`)) issues.push({ level: "warning", message: `ID sudah ada di periode ${next.period}` });
      seen.add(`${row.code}|${next.period}`);
    }
    return { ...next, issues };
  });
}

/** Baca unggahan .xlsx (satu kegiatan atau gabungan) atau .zip (folder Keamanan / paket arsitektur semua domain). */
export function readUpload(name: string, data: Uint8Array) {
  const unsupported: string[] = [];
  const files: string[] = [];
  const rows: Raw[] = [];
  const visit = (path: string, content: Uint8Array) => {
    const lower = path.toLowerCase();
    if (lower.endsWith(".zip")) {
      for (const [inner, bytes] of Object.entries(unzipSync(content))) visit(`${path}/${inner}`, bytes);
    } else if (lower.endsWith(".xlsx")) {
      const file = path.split("/").pop()!.replace(/\.xlsx$/i, "");
      // "Perangkat Keras Keamanan" milik domain Infrastruktur.
      if (!/infrastruktur/.test(lower) && kegiatanFromName(file)) {
        files.push(file);
        rows.push(...parseBook(content, file));
      } else unsupported.push(file);
    }
  };
  if (name.toLowerCase().endsWith(".zip")) {
    for (const [path, content] of Object.entries(unzipSync(data))) visit(path, content);
  } else if (name.toLowerCase().endsWith(".xlsx")) {
    rows.push(...parseBook(data, name.replace(/\.xlsx$/i, "")));
    files.push(name);
  } else throw new Error("Format berkas harus .xlsx atau .zip");
  if (!files.length) throw new Error("Tidak ada template Domain Arsitektur Keamanan di berkas ini.");
  return { file: files.length > 1 ? `${files.length} berkas kegiatan` : (files[0] ?? null), unsupported, rows };
}
