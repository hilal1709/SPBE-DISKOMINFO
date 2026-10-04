import { unzipSync } from "fflate";
import * as XLSX from "xlsx";
import type { RabIndex } from "./rab-index";
import { perangkatDaerah, type PeriodOptions } from "./reference";

export type ImportIssue = { level: "error" | "warning"; message: string };
export type ImportRow = {
  line: number;
  code: string | null;
  name: string;
  description: string | null;
  opd: string | null;
  opdRaw: string | null;
  probisStatus: "new" | "upgrade" | "as_is";
  period: string;
  rab1: string | null;
  rab2: string | null;
  rab3: string | null;
  rabL4: string | null;
  rabL5: string | null;
  strategicGoal: string | null;
  iku: string | null;
  ikuTarget: string | null;
  ikuRealization: string | null;
  issues: ImportIssue[];
};
export type ImportResult = { file: string | null; unsupported: string[]; rows: ImportRow[] };

type Field = Exclude<keyof ImportRow, "line" | "issues" | "opd" | "period" | "probisStatus"> | "status" | "periode";

/** Pencocokan header template (header panjang berisi petunjuk, jadi cocokkan awalannya). */
const headers: [RegExp, Field][] = [
  [/^nama bisnis|^nama proses bisnis/, "name"],
  [/^id$|^id probis/, "code"],
  [/^uraian/, "description"],
  [/unit kerja|perangkat daerah/, "opdRaw"],
  [/rab level 1/, "rab1"],
  [/rab level 2/, "rab2"],
  [/rab level 3/, "rab3"],
  [/rab level 4/, "rabL4"],
  [/rab level 5/, "rabL5"],
  [/^sasaran strategis/, "strategicGoal"],
  [/^indikator kinerja|^iku$/, "iku"],
  [/^nilai iku target/, "ikuTarget"],
  [/^nilai iku (terealisasi|realisasi)/, "ikuRealization"],
  [/^status probis|^status$/, "status"],
  [/^periode/, "periode"],
];

const normalize = (text: unknown) => String(text ?? "").replace(/[→←]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
const text = (value: unknown) => {
  const v = String(value ?? "").trim();
  return v ? v : null;
};
/** Sel RAB berisi "RAB.09.06.03 NAMA" — ambil kodenya saja. */
const rabCode = (value: unknown) => String(value ?? "").match(/RAB(?:\.\d{2}){1,3}/i)?.[0].toUpperCase() ?? null;
/** Sel RAB L4/L5: teks apa adanya; kodenya dicocokkan ke referensi saat validasi (lihat `validateRows`). */
const deepCell = (value: unknown) => text(value);
const deepCode = (raw: string | null, rab: RabIndex) => {
  const code = raw?.match(/^RAB(?:\.\d{2}){4,5}/i)?.[0].toUpperCase();
  return code && rab.byCode.has(code) ? code : raw;
};

function matchPd(raw: string | null) {
  if (!raw) return null;
  const key = raw.toLowerCase().trim();
  return perangkatDaerah.find((pd) => pd.code.toLowerCase() === key || pd.name.toLowerCase() === key)?.code
    ?? perangkatDaerah.find((pd) => key.includes(pd.name.toLowerCase()) || pd.name.toLowerCase().includes(key))?.code
    ?? null;
}

const statusOf = (raw: string | null): ImportRow["probisStatus"] => {
  const v = raw?.toLowerCase() ?? "";
  if (/baru|new/.test(v)) return "new";
  if (/upgrade|pengembangan/.test(v)) return "upgrade";
  return "as_is";
};

/** Cari workbook Proses Bisnis di dalam zip (termasuk zip bertingkat). */
function findInZip(data: Uint8Array, unsupported: string[], prefix = ""): { name: string; data: Uint8Array } | null {
  let found: { name: string; data: Uint8Array } | null = null;
  for (const [path, content] of Object.entries(unzipSync(data))) {
    const lower = path.toLowerCase();
    if (lower.endsWith(".zip")) {
      found ??= findInZip(content, unsupported, `${prefix}${path}/`);
    } else if (lower.endsWith(".xlsx")) {
      if (/proses bisnis/.test(lower) && !/gabungan/.test(lower)) found ??= { name: prefix + path, data: content };
      else unsupported.push((prefix + path).split("/").pop()!.replace(/\.xlsx$/i, ""));
    }
  }
  return found;
}

function parseSheet(data: Uint8Array): Omit<ImportRow, "issues">[] {
  const book = XLSX.read(data, { type: "array" });
  const sheet = book.Sheets["Proses Bisnis"] ?? book.Sheets[book.SheetNames[0]!];
  const table = XLSX.utils.sheet_to_json<unknown[]>(sheet!, { header: 1, blankrows: false });
  const [head = [], ...body] = table;
  const map = new Map<number, Field>();
  head.forEach((cell, i) => {
    const h = normalize(cell);
    const hit = headers.find(([re]) => re.test(h));
    if (hit && ![...map.values()].includes(hit[1])) map.set(i, hit[1]);
  });
  if (![...map.values()].includes("name")) throw new Error("Kolom “Nama Bisnis/Urusan” tidak ditemukan. Pastikan memakai template Domain Arsitektur Proses Bisnis.");

  return body
    .map((cells, i) => {
      const get = (field: Field) => {
        for (const [col, f] of map) if (f === field) return cells[col];
        return undefined;
      };
      const opdRaw = text(get("opdRaw"));
      const period = text(get("periode"));
      return {
        line: i + 2,
        code: text(get("code")),
        name: text(get("name")) ?? "",
        description: text(get("description")),
        opd: matchPd(opdRaw),
        opdRaw,
        probisStatus: statusOf(text(get("status"))),
        period: period ? period.replace(/\s*[-–—]\s*/, "–") : "",
        rab1: rabCode(get("rab1")),
        rab2: rabCode(get("rab2")),
        rab3: rabCode(get("rab3")),
        rabL4: deepCell(get("rabL4")),
        rabL5: deepCell(get("rabL5")),
        strategicGoal: text(get("strategicGoal")),
        iku: text(get("iku")),
        ikuTarget: text(get("ikuTarget")),
        ikuRealization: text(get("ikuRealization")),
      };
    })
    .filter((row) => row.name || row.rab3 || row.code);
}

/** Validasi & normalisasi: L1/L2 diturunkan dari L3, PD dicocokkan, ID ganda ditandai. */
export function validateRows(
  rows: Omit<ImportRow, "issues">[],
  { existing, lockedOpd, periods, rabFor }: { existing: Set<string>; lockedOpd: string | null; periods: PeriodOptions; /** Referensi RAB milik periode baris. */ rabFor: (period: string) => RabIndex },
): ImportRow[] {
  const seen = new Set<string>();
  return rows.map((row) => {
    const issues: ImportIssue[] = [];
    const next = { ...row, period: row.period || periods.active };
    if (!periods.periods.includes(next.period)) issues.push({ level: "error", message: `Periode “${next.period}” belum terdaftar` });
    const rab = rabFor(next.period);
    next.rabL4 = deepCode(row.rabL4, rab);
    next.rabL5 = deepCode(row.rabL5, rab);
    if (!row.name || row.name.length < 3) issues.push({ level: "error", message: "Nama proses bisnis kosong" });

    const l3 = row.rab3 ? rab.byCode.get(row.rab3) : undefined;
    if (!row.rab3) issues.push({ level: "error", message: "RAB Level 3 kosong" });
    else if (l3?.level !== 3) issues.push({ level: "error", message: `RAB Level 3 “${row.rab3}” tidak dikenal` });
    else if (!rab.active(l3)) issues.push({ level: "error", message: `RAB Level 3 “${row.rab3}” sudah tidak berlaku` });
    else {
      const l2 = l3.parent!;
      const l1 = rab.byCode.get(l2)!.parent!;
      if ((row.rab2 && row.rab2 !== l2) || (row.rab1 && row.rab1 !== l1)) issues.push({ level: "warning", message: `RAB L1/L2 disesuaikan dengan L3 (${l1} › ${l2})` });
      else if (!row.rab1 || !row.rab2) issues.push({ level: "warning", message: "RAB L1/L2 diisi otomatis dari L3" });
      next.rab1 = l1;
      next.rab2 = l2;
    }

    // L4/L5: bila referensi di bawah induknya tersedia, isian wajib salah satu kodenya (aturan sama dengan form).
    const deepIssue = (value: string | null, parent: string | null, level: number) => {
      if (!value) return;
      const known = rab.byCode.get(value);
      if ((known && known.parent !== parent) || (!known && rab.children(parent).length)) issues.push({ level: "error", message: `RAB Level ${level} bukan turunan ${parent ?? "level di atasnya"}` });
    };
    deepIssue(next.rabL4, next.rab3, 4);
    deepIssue(next.rabL5, rab.byCode.get(next.rabL4 ?? "")?.level === 4 ? next.rabL4 : null, 5);

    if (lockedOpd) {
      if (row.opd && row.opd !== lockedOpd) issues.push({ level: "error", message: "Unit kerja berbeda dengan OPD akun Anda" });
      else if (!row.opd) issues.push({ level: "warning", message: "Unit kerja diisi OPD akun Anda" });
      next.opd = lockedOpd;
    } else if (!row.opd) {
      issues.push({ level: "error", message: row.opdRaw ? `Unit kerja “${row.opdRaw}” tidak dikenal` : "Unit kerja kosong" });
    }

    if (row.code) {
      if (seen.has(`${row.code}|${next.period}`)) issues.push({ level: "error", message: "ID ganda di dalam file" });
      else if (existing.has(`${row.code}|${next.period}`)) issues.push({ level: "warning", message: `ID sudah ada di periode ${next.period}` });
      seen.add(`${row.code}|${next.period}`);
    }
    return { ...next, issues };
  });
}

/** Baca unggahan .xlsx atau .zip dan kembalikan baris mentah Proses Bisnis. */
export function readUpload(name: string, data: Uint8Array) {
  const unsupported: string[] = [];
  let file: { name: string; data: Uint8Array } | null = { name, data };
  if (name.toLowerCase().endsWith(".zip")) file = findInZip(data, unsupported);
  else if (!name.toLowerCase().endsWith(".xlsx")) throw new Error("Format berkas harus .xlsx atau .zip");
  return { file: file?.name ?? null, unsupported, rows: file ? parseSheet(file.data) : [] };
}
