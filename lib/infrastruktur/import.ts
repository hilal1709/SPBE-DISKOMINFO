import * as XLSX from "xlsx";
import { readWorkbook, unzipSafe, uploadBudget, type UploadBudget } from "@/lib/security/upload";
import { matchRefs, parts, type DepRef } from "@/lib/data/import";
import { securityFields, type SecurityKey } from "@/lib/data/reference";
import { matchPd, normalize, text } from "@/lib/probis/import";
import type { RabIndex } from "@/lib/probis/rab-index";
import type { PeriodOptions } from "@/lib/probis/reference";
import { jenisConfig, jenisFromName, kepemilikanLabel, relasiMatch, toKepemilikan, type InfraJenis, type InfraKepemilikan, type Relasi } from "./jenis";
import { isRaiLeaf } from "./reference";

export type ImportIssue = { level: "error" | "warning"; message: string };
export type InfrastrukturImportRow = {
  line: number;
  /** Unik per unggahan: "sheet:baris". */
  key: string;
  /** Sheet/berkas asal (satu komponen per sheet). */
  source: string;
  jenis: InfraJenis;
  code: string | null;
  name: string;
  deskripsi: string | null;
  pemilik: string | null;
  kepemilikan: InfraKepemilikan | null;
  kepemilikanRaw: string | null;
  pengelola: string | null;
  atribut: Record<string, string>;
  /** Instansi (kode PD). */
  opd: string | null;
  opdRaw: string | null;
  period: string;
  rai1: string | null;
  rai2: string | null;
  rai3: string | null;
  /** Node RAI terdalam yang dipakai (L3, atau L2 tanpa turunan). */
  rai: string | null;
  /** Komponen lain yang ditautkan: kode atau nama (bisa komponen baru di unggahan yang sama). */
  relasi: string[];
  aplikasiRaw: string | null;
  dataRaw: string | null;
  probisRaw: string | null;
  aplikasi: string[];
  data: string[];
  probis: string[];
  security: Partial<Record<SecurityKey, string[]>>;
  issues: ImportIssue[];
};
export type InfrastrukturImportResult = { file: string | null; unsupported: string[]; rows: InfrastrukturImportRow[] };

type Raw = Omit<InfrastrukturImportRow, "issues">;
type Field = "name" | "code" | "deskripsi" | "pemilik" | "kepemilikan" | "pengelola" | "rai1" | "rai2" | "rai3" | "opd" | "periode" | `attr:${string}` | `rel:${Relasi}` | `sec:${SecurityKey}`;

const secMatch: [RegExp, SecurityKey][] = [
  [/standar teknis/, "standar"],
  [/audit keamanan/, "audit"],
  [/identifikasi kerentanan/, "kerentanan"],
  [/kelaikan keamanan/, "kelaikan"],
  [/edukasi kesadaran/, "edukasi"],
  [/penanganan insiden/, "insiden"],
  [/peningkatan keamanan/, "peningkatan"],
];

/** Header template berisi panah, akhiran "(Dependency)", dan petunjuk panjang; cocokkan polanya per komponen. */
function fieldOf(header: string, jenis: InfraJenis): Field | null {
  const h = header.replace(/\((dependency|function|information)\)/g, "").trim();
  const cfg = jenisConfig[jenis];
  if (h === normalize(cfg.nameHeader) || /^nama (?!pemilik)/.test(h)) return "name";
  if (/^id$/.test(h)) return "code";
  const attr = cfg.attrs.find((a) => a.match.test(h));
  if (attr) return `attr:${attr.key}`;
  if (/^deskripsi/.test(h)) return "deskripsi";
  if (/^nama pemilik/.test(h)) return "pemilik";
  if (/kepemilik/.test(h)) return "kepemilikan";
  if (/^unit (kerja )?(pengelola|penanggung)/.test(h)) return "pengelola";
  const rai = h.match(/^rai level (\d)/);
  if (rai) return `rai${rai[1]}` as Field;
  if (/^instansi|perangkat daerah/.test(h)) return "opd";
  if (/^periode/.test(h)) return "periode";
  const sec = secMatch.find(([re]) => re.test(h));
  if (sec) return `sec:${sec[1]}`;
  const rel = relasiMatch.find(([re]) => re.test(h));
  if (rel && (cfg.relasi.includes(rel[1]) || cfg.fungsi?.includes(rel[1] as InfraJenis))) return `rel:${rel[1]}`;
  return null;
}

/** Sel referensi berisi "RAI.03.01 NAMA" — ambil kodenya saja. */
const raiCode = (value: unknown) => String(value ?? "").match(/RAI(?:\.\d{2}){1,3}/i)?.[0].toUpperCase() ?? null;

/** Baca satu sheet komponen. Baris header dicari di tiga baris pertama (template memiliki baris teknis "Component …"). */
function parseSheet(sheet: XLSX.WorkSheet, source: string, fallback: InfraJenis | null): Raw[] {
  const table = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false });
  const headIndex = table.slice(0, 3).findIndex((row) => row.some((cell) => /^nama /.test(normalize(cell))));
  if (headIndex < 0) return [];
  const head = table[headIndex]!;
  const marker = head.map((c) => String(c ?? "")).find((c) => /^component:/i.test(c));
  const jenis = (marker && jenisFromName(marker.slice(10))) || jenisFromName(source) || fallback;
  if (!jenis) return [];
  const map = new Map<number, Field>();
  head.forEach((cell, i) => {
    const field = fieldOf(normalize(cell), jenis);
    if (field && ![...map.values()].includes(field)) map.set(i, field);
  });
  if (![...map.values()].includes("name")) return [];

  return table
    .slice(headIndex + 1)
    .map((cells, i) => {
      const get = (field: Field) => {
        for (const [col, f] of map) if (f === field) return cells[col];
        return undefined;
      };
      const rel = (r: Relasi) => text(get(`rel:${r}`));
      const opdRaw = text(get("opd"));
      const period = text(get("periode"));
      const kepemilikanRaw = text(get("kepemilikan"));
      const cfg = jenisConfig[jenis];
      return {
        line: headIndex + i + 2,
        key: `${source}:${headIndex + i + 2}`,
        source,
        jenis,
        code: text(get("code")),
        name: text(get("name")) ?? "",
        deskripsi: text(get("deskripsi")),
        pemilik: text(get("pemilik")),
        kepemilikan: toKepemilikan(kepemilikanRaw),
        kepemilikanRaw,
        pengelola: text(get("pengelola")),
        atribut: Object.fromEntries(cfg.attrs.map((a) => [a.key, text(get(`attr:${a.key}`))]).filter((e): e is [string, string] => !!e[1])),
        opd: matchPd(opdRaw),
        opdRaw,
        period: period ? period.replace(/\s*[-–—]\s*/, "–") : "",
        rai1: raiCode(get("rai1")),
        rai2: raiCode(get("rai2")),
        rai3: raiCode(get("rai3")),
        rai: null,
        relasi: [...cfg.relasi, ...(cfg.fungsi ?? [])].filter((r) => !["aplikasi", "data", "probis"].includes(r)).flatMap((r) => parts(rel(r))),
        aplikasiRaw: rel("aplikasi"),
        dataRaw: rel("data"),
        probisRaw: rel("probis"),
        aplikasi: [],
        data: [],
        probis: [],
        security: Object.fromEntries(securityFields.map((f) => [f.key, parts(text(get(`sec:${f.key}`)))]).filter(([, v]) => v.length)),
      };
    })
    .filter((row) => row.name || row.code);
}

function parseBook(data: Uint8Array, file: string, budget: UploadBudget): Raw[] {
  const book = readWorkbook(data, budget);
  // Workbook satu komponen: sheet pertama; workbook gabungan: tiap sheet yang dikenali (sheet referensi RAI dilewati).
  return book.SheetNames.filter((name) => !/^r[a-z]{2} level/i.test(name)).flatMap((name) => parseSheet(book.Sheets[name]!, name, jenisFromName(file)));
}

/** Validasi & normalisasi: RAI L1/L2 diturunkan dari RAI terdalam (bawaan per komponen), instansi & relasi dicocokkan. */
export function validateRows(
  rows: Raw[],
  {
    existing,
    lockedOpd,
    periods,
    raiFor,
    infra,
    aplikasi,
    data,
    probis,
  }: {
    existing: Set<string>;
    lockedOpd: string | null;
    periods: PeriodOptions;
    raiFor: (period: string) => RabIndex;
    /** Komponen yang sudah ada (untuk memeriksa relasi). */
    infra: DepRef[];
    aplikasi: DepRef[];
    data: DepRef[];
    /** Hanya proses bisnis yang sudah disetujui. */
    probis: DepRef[];
  },
): InfrastrukturImportRow[] {
  const seen = new Set<string>();
  const names = new Set(rows.map((r) => `${r.period || periods.active}|${r.name.toLowerCase()}`));
  return rows.map((row) => {
    const issues: ImportIssue[] = [];
    const cfg = jenisConfig[row.jenis];
    const next = { ...row, period: row.period || periods.active };
    if (!periods.periods.includes(next.period)) issues.push({ level: "error", message: `Periode “${next.period}” belum terdaftar` });
    const rai = raiFor(next.period);
    if (!row.name || row.name.length < 2) issues.push({ level: "error", message: `${cfg.nameHeader} kosong` });

    // RAI terdalam: L3 bila diisi, selain itu L2; bila kosong dipakai RAI bawaan komponen.
    let leaf = row.rai3 ?? (row.rai2 && !rai.children(row.rai2).length ? row.rai2 : null);
    if (!leaf && !row.rai2) {
      leaf = cfg.rai;
      issues.push({ level: "warning", message: `RAI kosong, diisi ${cfg.rai} (${rai.byCode.get(cfg.rai)?.name ?? cfg.label})` });
    }
    const node = leaf ? rai.byCode.get(leaf) : undefined;
    if (!leaf) issues.push({ level: "error", message: "RAI Level 3 kosong" });
    else if (!isRaiLeaf(rai, leaf)) issues.push({ level: "error", message: `RAI “${leaf}” tidak dikenal` });
    else if (!rai.active(node)) issues.push({ level: "error", message: `RAI “${leaf}” sudah tidak berlaku` });
    else {
      const [l2, l1] = node!.level === 3 ? [node!.parent!, rai.byCode.get(node!.parent!)!.parent!] : [node!.code, node!.parent!];
      if ((row.rai2 && row.rai2 !== l2) || (row.rai1 && row.rai1 !== l1)) issues.push({ level: "warning", message: `RAI L1/L2 disesuaikan dengan ${leaf} (${l1} › ${l2})` });
      next.rai = leaf;
      next.rai1 = l1!;
      next.rai2 = l2!;
      next.rai3 = node!.level === 3 ? leaf : null;
    }

    if (row.kepemilikanRaw && !row.kepemilikan) issues.push({ level: "warning", message: `Kepemilikan “${row.kepemilikanRaw}” tidak dikenali, dikosongkan` });
    else if (row.kepemilikan && row.kepemilikanRaw && row.kepemilikanRaw.toLowerCase() !== kepemilikanLabel[row.kepemilikan].toLowerCase())
      issues.push({ level: "warning", message: `Kepemilikan “${row.kepemilikanRaw}” dibaca sebagai ${kepemilikanLabel[row.kepemilikan]}` });

    if (lockedOpd) {
      if (row.opd && row.opd !== lockedOpd) issues.push({ level: "error", message: "Instansi berbeda dengan OPD akun Anda" });
      else if (!row.opd) issues.push({ level: "warning", message: "Instansi diisi OPD akun Anda" });
      next.opd = lockedOpd;
    } else if (!row.opd) {
      issues.push({ level: "error", message: row.opdRaw ? `Instansi “${row.opdRaw}” tidak dikenal` : "Instansi kosong" });
    }

    // Relasi antarkomponen: komponen yang sudah ada atau yang ikut diunggah.
    const pool = infra.filter((p) => p.period === next.period);
    const lost = row.relasi.filter((r) => !pool.some((p) => p.code.toLowerCase() === r.toLowerCase() || p.name.toLowerCase() === r.toLowerCase()) && !names.has(`${next.period}|${r.toLowerCase()}`));
    if (lost.length) issues.push({ level: "warning", message: `Komponen terkait tidak ditemukan: ${lost.slice(0, 3).join(", ")}${lost.length > 3 ? "…" : ""}` });
    for (const [key, raw, refs, noun] of [
      ["aplikasi", row.aplikasiRaw, aplikasi, "Aplikasi"],
      ["data", row.dataRaw, data, "Data"],
      ["probis", row.probisRaw, probis, "Proses bisnis tervalidasi"],
    ] as const) {
      const m = matchRefs(raw, refs.filter((p) => p.period === next.period), next.opd);
      next[key] = m.found;
      if (m.missing.length) issues.push({ level: "warning", message: `${noun} tidak ditemukan: ${m.missing.slice(0, 3).join(", ")}${m.missing.length > 3 ? "…" : ""}` });
    }

    if (row.code) {
      if (seen.has(`${row.code}|${next.period}`)) issues.push({ level: "error", message: "ID ganda di dalam file" });
      else if (existing.has(`${row.code}|${next.period}`)) issues.push({ level: "warning", message: `ID sudah ada di periode ${next.period}` });
      seen.add(`${row.code}|${next.period}`);
    }
    return { ...next, issues };
  });
}

/** Baca unggahan .xlsx (satu komponen atau gabungan) atau .zip (folder Infrastruktur / paket arsitektur semua domain). */
export function readUpload(name: string, data: Uint8Array) {
  const unsupported: string[] = [];
  const files: string[] = [];
  const rows: Raw[] = [];
  const budget = uploadBudget();
  const visit = (path: string, content: Uint8Array) => {
    const lower = path.toLowerCase();
    if (lower.endsWith(".zip")) {
      for (const [inner, bytes] of Object.entries(unzipSafe(content, path, budget))) visit(`${path}/${inner}`, bytes);
    } else if (lower.endsWith(".xlsx")) {
      const file = path.split("/").pop()!.replace(/\.xlsx$/i, "");
      if (/infrastruktur/.test(lower) || jenisFromName(file)) {
        const parsed = parseBook(content, file, budget);
        if (parsed.length || jenisFromName(file)) files.push(file);
        rows.push(...parsed);
      } else unsupported.push(file);
    }
  };
  if (name.toLowerCase().endsWith(".zip")) {
    for (const [path, content] of Object.entries(unzipSafe(data, "", budget))) visit(path, content);
  } else if (name.toLowerCase().endsWith(".xlsx")) {
    rows.push(...parseBook(data, name.replace(/\.xlsx$/i, ""), budget));
    files.push(name);
  } else throw new Error("Format berkas harus .xlsx atau .zip");
  if (!files.length) throw new Error("Tidak ada template Domain Arsitektur Infrastruktur di berkas ini.");
  return { file: files.length > 1 ? `${files.length} berkas komponen` : (files[0] ?? null), unsupported, rows };
}
