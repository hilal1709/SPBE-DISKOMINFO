import * as XLSX from "xlsx";
import { readWorkbook } from "@/lib/security/upload";
import { matchRefs, parts, type DepRef } from "@/lib/data/import";
import { securityFields, type SecurityKey } from "@/lib/data/reference";
import { findInZip, matchPd, normalize, text } from "@/lib/probis/import";
import type { RabIndex } from "@/lib/probis/rab-index";
import type { PeriodOptions } from "@/lib/probis/reference";
import { basisLabel, instansiPusat, isRaaLeaf, lisensiLabel, type Basis, type Lisensi } from "./reference";

export type ImportIssue = { level: "error" | "warning"; message: string };
export type AplikasiImportRow = {
  line: number;
  code: string | null;
  name: string;
  uraian: string | null;
  fungsi: string | null;
  luaran: string | null;
  mesin: string | null;
  basis: Basis | null;
  basisRaw: string | null;
  lisensi: Lisensi | null;
  lisensiRaw: string | null;
  bahasa: string | null;
  kerangka: string | null;
  /** Unit operasional teknologi (kode PD). */
  opd: string | null;
  opdRaw: string | null;
  /** Kode PD pengembang, atau nama K/L/penyedia apa adanya. */
  pengembang: string | null;
  period: string;
  raa1: string | null;
  raa2: string | null;
  raa3: string | null;
  /** Node RAA terdalam yang dipakai (L3, atau L2 tanpa turunan). */
  raa: string | null;
  /** Isian sel dependensi (kode atau nama, dipisah baris/titik koma). */
  probisRaw: string | null;
  layananRaw: string | null;
  dataRaw: string | null;
  probis: string[];
  layanan: string[];
  data: string[];
  inputData: string | null;
  outputData: string | null;
  supplier: string | null;
  customer: string | null;
  cloud: string | null;
  server: string | null;
  splp: string | null;
  jip: string | null;
  security: Partial<Record<SecurityKey, string[]>>;
  issues: ImportIssue[];
};
export type AplikasiImportResult = { file: string | null; unsupported: string[]; rows: AplikasiImportRow[] };

type Raw = Omit<AplikasiImportRow, "issues">;
type Field =
  | "name" | "code" | "uraian" | "fungsi" | "luaran" | "mesin" | "basisRaw" | "lisensiRaw" | "bahasa" | "raa1" | "raa2" | "raa3"
  | "layananRaw" | "dataRaw" | "probisRaw" | "inputData" | "supplier" | "outputData" | "customer" | "cloud" | "server" | "splp" | "jip"
  | "kerangka" | "pengembangRaw" | "opdRaw" | "periode" | `sec:${SecurityKey}`;

/** Pencocokan header template "Domain Arsitektur Aplikasi.xlsx" (32 kolom; header berisi panah & petunjuk, jadi cocokkan polanya). */
const headers: [RegExp, Field][] = [
  [/^nama aplikasi/, "name"],
  [/^id$|^id aplikasi/, "code"],
  [/^uraian/, "uraian"],
  [/^fungsi/, "fungsi"],
  [/^luaran data/, "outputData"],
  [/^luaran/, "luaran"],
  [/basis data|^mesin/, "mesin"],
  [/^basis aplikasi/, "basisRaw"],
  [/lisensi/, "lisensiRaw"],
  [/bahasa pemrograman/, "bahasa"],
  [/raa level 1/, "raa1"],
  [/raa level 2/, "raa2"],
  [/raa level 3/, "raa3"],
  [/^layanan/, "layananRaw"],
  [/^data yang digunakan/, "dataRaw"],
  [/^proses bisnis/, "probisRaw"],
  [/^inputan data|^input data/, "inputData"],
  [/^supplier/, "supplier"],
  [/^customer/, "customer"],
  [/komputasi awan|cloud/, "cloud"],
  [/server/, "server"],
  [/penghubung layanan|splp/, "splp"],
  [/jaringan intra|jip/, "jip"],
  [/kerangka/, "kerangka"],
  [/unit pengembang|pengembang/, "pengembangRaw"],
  [/unit operasional|perangkat daerah/, "opdRaw"],
  [/standar teknis/, "sec:standar"],
  [/audit keamanan/, "sec:audit"],
  [/identifikasi kerentanan/, "sec:kerentanan"],
  [/kelaikan keamanan/, "sec:kelaikan"],
  [/edukasi kesadaran/, "sec:edukasi"],
  [/penanganan insiden/, "sec:insiden"],
  [/peningkatan keamanan/, "sec:peningkatan"],
  [/^periode/, "periode"],
];

/** Sel referensi berisi "RAA.01.02 NAMA" — ambil kodenya saja. */
const raaCode = (value: unknown) => String(value ?? "").match(/RAA(?:\.\d{2}){1,3}/i)?.[0].toUpperCase() ?? null;
/** Sel infrastruktur: kosong, "-", atau "tidak" berarti tidak memakai komponen itu. */
const infra = (value: unknown) => {
  const v = text(value);
  return !v || /^(-|tidak|tidak ada|belum|n\/?a)$/i.test(v) ? null : v;
};

/** Teks pilihan → nilai tetap; `guessed` bila tidak sama persis dengan label template. */
function pick<T extends string>(raw: string | null, labels: Record<T, string>, guess: (v: string) => T | null): { value: T | null; guessed: boolean } {
  const v = (raw ?? "").toLowerCase().trim();
  if (!v) return { value: null, guessed: false };
  const exact = (Object.entries(labels) as [T, string][]).find(([key, label]) => v === key || v === label.toLowerCase());
  return exact ? { value: exact[0], guessed: false } : { value: guess(v), guessed: true };
}
export const toBasis = (raw: string | null) =>
  pick<Basis>(raw, basisLabel, (v) => (/mobile|android|ios|apk/.test(v) ? "mobile" : /desktop|windows/.test(v) ? "desktop" : /cloud|saas/.test(v) ? "cloud" : /web|browser|online/.test(v) ? "web" : null));
export const toLisensi = (raw: string | null) =>
  pick<Lisensi>(raw, lisensiLabel, (v) => (/open|terbuka|gratis|gpl|mit/.test(v) ? "open_source" : /propriet|berbayar|komersial|tertutup|lisensi/.test(v) ? "proprietary" : null));

/** Unit pengembang: PD Gresik → kode PD; K/L dikenal → nama bakunya; selain itu teks apa adanya (penyedia). */
export function toPengembang(raw: string | null) {
  if (!raw) return null;
  const pusat = instansiPusat.find((k) => k.toLowerCase() === raw.toLowerCase().trim());
  return pusat ?? matchPd(raw) ?? raw;
}

function parseSheet(data: Uint8Array): Raw[] {
  const book = readWorkbook(data);
  const sheet = book.Sheets["Aplikasi"] ?? book.Sheets[book.SheetNames[0]!];
  const table = XLSX.utils.sheet_to_json<unknown[]>(sheet!, { header: 1, blankrows: false });
  const [head = [], ...body] = table;
  const map = new Map<number, Field>();
  head.forEach((cell, i) => {
    const h = normalize(cell);
    const hit = headers.find(([re]) => re.test(h));
    if (hit && ![...map.values()].includes(hit[1])) map.set(i, hit[1]);
  });
  if (![...map.values()].includes("name")) throw new Error("Kolom “Nama Aplikasi” tidak ditemukan. Pastikan memakai template Domain Arsitektur Aplikasi.");

  return body
    .map((cells, i) => {
      const get = (field: Field) => {
        for (const [col, f] of map) if (f === field) return cells[col];
        return undefined;
      };
      const opdRaw = text(get("opdRaw"));
      const period = text(get("periode"));
      const basisRaw = text(get("basisRaw"));
      const lisensiRaw = text(get("lisensiRaw"));
      return {
        line: i + 2,
        code: text(get("code")),
        name: text(get("name")) ?? "",
        uraian: text(get("uraian")),
        fungsi: text(get("fungsi")),
        luaran: text(get("luaran")),
        mesin: text(get("mesin")),
        basis: toBasis(basisRaw).value,
        basisRaw,
        lisensi: toLisensi(lisensiRaw).value,
        lisensiRaw,
        bahasa: text(get("bahasa")),
        kerangka: text(get("kerangka")),
        opd: matchPd(opdRaw),
        opdRaw,
        pengembang: toPengembang(text(get("pengembangRaw"))),
        period: period ? period.replace(/\s*[-–—]\s*/, "–") : "",
        raa1: raaCode(get("raa1")),
        raa2: raaCode(get("raa2")),
        raa3: raaCode(get("raa3")),
        raa: null,
        probisRaw: text(get("probisRaw")),
        layananRaw: text(get("layananRaw")),
        dataRaw: text(get("dataRaw")),
        probis: [],
        layanan: [],
        data: [],
        inputData: text(get("inputData")),
        outputData: text(get("outputData")),
        supplier: text(get("supplier")),
        customer: text(get("customer")),
        cloud: infra(get("cloud")),
        server: infra(get("server")),
        splp: infra(get("splp")),
        jip: infra(get("jip")),
        security: Object.fromEntries(securityFields.map((f) => [f.key, parts(text(get(`sec:${f.key}`)))]).filter(([, v]) => v.length)),
      };
    })
    .filter((row) => row.name || row.raa2 || row.code);
}

/** Validasi & normalisasi: L1 diturunkan dari RAA terdalam, PD & dependensi dicocokkan, ID ganda ditandai. */
export function validateRows(
  rows: Raw[],
  {
    existing,
    lockedOpd,
    periods,
    raaFor,
    probis,
    layanan,
    data,
  }: {
    existing: Set<string>;
    lockedOpd: string | null;
    periods: PeriodOptions;
    /** Referensi RAA milik periode baris. */
    raaFor: (period: string) => RabIndex;
    /** Hanya proses bisnis yang sudah disetujui (aplikasi wajib selaras probis tervalidasi). */
    probis: DepRef[];
    layanan: DepRef[];
    data: DepRef[];
  },
): AplikasiImportRow[] {
  const seen = new Set<string>();
  return rows.map((row) => {
    const issues: ImportIssue[] = [];
    const next = { ...row, period: row.period || periods.active };
    if (!periods.periods.includes(next.period)) issues.push({ level: "error", message: `Periode “${next.period}” belum terdaftar` });
    const raa = raaFor(next.period);
    if (!row.name || row.name.length < 2) issues.push({ level: "error", message: "Nama aplikasi kosong" });
    if (!row.uraian || row.uraian.length < 10) issues.push({ level: "error", message: "Uraian aplikasi kosong atau terlalu singkat" });
    if (!row.fungsi || row.fungsi.length < 10) issues.push({ level: "error", message: "Fungsi aplikasi kosong atau terlalu singkat" });
    if (!row.luaran || row.luaran.length < 3) issues.push({ level: "error", message: "Luaran aplikasi kosong" });

    // RAA terdalam: L3 bila diisi, selain itu L2 yang memang tidak memiliki turunan.
    const leaf = row.raa3 ?? (row.raa2 && !raa.children(row.raa2).length ? row.raa2 : null);
    const node = leaf ? raa.byCode.get(leaf) : undefined;
    if (!leaf) issues.push({ level: "error", message: row.raa2 ? "RAA Level 3 kosong" : "RAA kosong" });
    else if (!isRaaLeaf(raa, leaf)) issues.push({ level: "error", message: `RAA “${leaf}” tidak dikenal` });
    else if (!raa.active(node)) issues.push({ level: "error", message: `RAA “${leaf}” sudah tidak berlaku` });
    else {
      const [l2, l1] = node!.level === 3 ? [node!.parent!, raa.byCode.get(node!.parent!)!.parent!] : [node!.code, node!.parent!];
      if ((row.raa2 && row.raa2 !== l2) || (row.raa1 && row.raa1 !== l1)) issues.push({ level: "warning", message: `RAA L1/L2 disesuaikan dengan ${leaf} (${l1} › ${l2})` });
      next.raa = leaf;
      next.raa1 = l1!;
      next.raa2 = l2!;
      next.raa3 = node!.level === 3 ? leaf : null;
    }

    const basis = toBasis(row.basisRaw);
    if (!basis.value) issues.push({ level: "error", message: row.basisRaw ? `Basis “${row.basisRaw}” tidak dikenali (Web Based, Mobile, Desktop, Cloud)` : "Basis aplikasi kosong" });
    else if (basis.guessed) issues.push({ level: "warning", message: `Basis “${row.basisRaw}” dibaca sebagai ${basisLabel[basis.value]}` });
    const lisensi = toLisensi(row.lisensiRaw);
    if (!lisensi.value) issues.push({ level: "error", message: row.lisensiRaw ? `Lisensi “${row.lisensiRaw}” tidak dikenali (Open Source, Proprietary)` : "Tipe lisensi kosong" });
    else if (lisensi.guessed) issues.push({ level: "warning", message: `Lisensi “${row.lisensiRaw}” dibaca sebagai ${lisensiLabel[lisensi.value]}` });
    if (!row.bahasa) {
      issues.push({ level: "warning", message: "Bahasa pemrograman kosong, diisi “Tidak diketahui”" });
      next.bahasa = "Tidak diketahui";
    }

    if (lockedOpd) {
      if (row.opd && row.opd !== lockedOpd) issues.push({ level: "error", message: "Unit operasional berbeda dengan OPD akun Anda" });
      else if (!row.opd) issues.push({ level: "warning", message: "Unit operasional diisi OPD akun Anda" });
      next.opd = lockedOpd;
    } else if (!row.opd) {
      issues.push({ level: "error", message: row.opdRaw ? `Unit operasional “${row.opdRaw}” tidak dikenal` : "Unit operasional teknologi kosong" });
    }
    if (!row.pengembang && next.opd) {
      issues.push({ level: "warning", message: "Unit pengembang kosong, diisi unit operasional" });
      next.pengembang = next.opd;
    }

    // Notulen: aplikasi wajib selaras proses bisnis yang sudah disetujui.
    const pb = matchRefs(row.probisRaw, probis.filter((p) => p.period === next.period), next.opd);
    next.probis = pb.found;
    if (pb.missing.length) issues.push({ level: "warning", message: `Proses bisnis tervalidasi tidak ditemukan: ${pb.missing.slice(0, 3).join(", ")}${pb.missing.length > 3 ? "…" : ""}` });
    if (!pb.found.length) issues.push({ level: "error", message: "Belum ada proses bisnis tervalidasi yang cocok" });
    const ly = matchRefs(row.layananRaw, layanan.filter((p) => p.period === next.period), next.opd);
    next.layanan = ly.found;
    if (ly.missing.length) issues.push({ level: "warning", message: `Layanan tidak ditemukan: ${ly.missing.slice(0, 3).join(", ")}${ly.missing.length > 3 ? "…" : ""}` });
    const dt = matchRefs(row.dataRaw, data.filter((p) => p.period === next.period), next.opd);
    next.data = dt.found;
    if (dt.missing.length) issues.push({ level: "warning", message: `Data tidak ditemukan: ${dt.missing.slice(0, 3).join(", ")}${dt.missing.length > 3 ? "…" : ""}` });

    if (row.code) {
      if (seen.has(`${row.code}|${next.period}`)) issues.push({ level: "error", message: "ID ganda di dalam file" });
      else if (existing.has(`${row.code}|${next.period}`)) issues.push({ level: "warning", message: `ID sudah ada di periode ${next.period}` });
      seen.add(`${row.code}|${next.period}`);
    }
    return { ...next, basis: basis.value, lisensi: lisensi.value, issues };
  });
}

/** Baca unggahan .xlsx atau .zip (paket arsitektur semua domain) dan kembalikan baris mentah Aplikasi. */
export function readUpload(name: string, data: Uint8Array) {
  const unsupported: string[] = [];
  let file: { name: string; data: Uint8Array } | null = { name, data };
  if (name.toLowerCase().endsWith(".zip")) file = findInZip(data, unsupported, /domain arsitektur aplikasi|aplikasi/);
  else if (!name.toLowerCase().endsWith(".xlsx")) throw new Error("Format berkas harus .xlsx atau .zip");
  return { file: file?.name ?? null, unsupported, rows: file ? parseSheet(file.data) : [] };
}
