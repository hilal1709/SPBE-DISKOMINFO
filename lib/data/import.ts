import * as XLSX from "xlsx";
import { findInZip, matchPd, normalize, text } from "@/lib/probis/import";
import type { RabIndex } from "@/lib/probis/rab-index";
import type { PeriodOptions } from "@/lib/probis/reference";
import { isRadLeaf, jenisLabel, securityFields, sifatLabel, validitasOptions, type Jenis, type SecurityKey, type Sifat } from "./reference";

export type ImportIssue = { level: "error" | "warning"; message: string };
export type DataImportRow = {
  line: number;
  code: string | null;
  name: string;
  uraian: string | null;
  tujuan: string | null;
  /** Wali data (kode PD). */
  opd: string | null;
  opdRaw: string | null;
  /** Kode PD produsen, atau nama instansi lain apa adanya. */
  produsen: string | null;
  output: string | null;
  input: string | null;
  period: string;
  sifat: Sifat | null;
  sifatRaw: string | null;
  jenis: Jenis | null;
  jenisRaw: string | null;
  validitas: string | null;
  validitasRaw: string | null;
  interoperabel: boolean | null;
  interopRaw: string | null;
  rad1: string | null;
  rad2: string | null;
  rad3: string | null;
  /** Node RAD terdalam yang dipakai (L3, atau L2 tanpa turunan). */
  rad: string | null;
  radL4: string | null;
  radL5: string | null;
  /** Isian sel "← Proses Bisnis" / "→ Layanan" (kode atau nama, dipisah baris/titik koma). */
  probisRaw: string | null;
  layananRaw: string | null;
  probis: string[];
  layanan: string[];
  security: Partial<Record<SecurityKey, string[]>>;
  issues: ImportIssue[];
};
export type DataImportResult = { file: string | null; unsupported: string[]; rows: DataImportRow[] };

type Raw = Omit<DataImportRow, "issues">;
type Field =
  | "name" | "code" | "uraian" | "tujuan" | "produsenRaw" | "opdRaw" | "output" | "input" | "radL4" | "radL5" | "sifatRaw" | "jenisRaw"
  | "validitasRaw" | "interopRaw" | "rad1" | "rad2" | "rad3" | "probisRaw" | "layananRaw" | "periode" | `sec:${SecurityKey}`;

/** Pencocokan header template "Domain Arsitektur Data dan Informasi.xlsx" (header berisi panah & petunjuk, jadi cocokkan polanya). */
const headers: [RegExp, Field][] = [
  [/^nama data/, "name"],
  [/^id$|^id data/, "code"],
  [/^uraian/, "uraian"],
  [/^tujuan/, "tujuan"],
  [/penghasil|produsen/, "produsenRaw"],
  [/wali data|penanggung jawab|perangkat daerah|unit kerja/, "opdRaw"],
  [/\(output\)|^output/, "output"],
  [/\(input\)|^input/, "input"],
  [/rad level 4/, "radL4"],
  [/rad level 5/, "radL5"],
  [/^sifat/, "sifatRaw"],
  [/^jenis/, "jenisRaw"],
  [/^validitas/, "validitasRaw"],
  [/^interoperabilitas/, "interopRaw"],
  [/rad level 1/, "rad1"],
  [/rad level 2/, "rad2"],
  [/rad level 3/, "rad3"],
  [/standar teknis/, "sec:standar"],
  [/audit keamanan/, "sec:audit"],
  [/identifikasi kerentanan/, "sec:kerentanan"],
  [/kelaikan keamanan/, "sec:kelaikan"],
  [/edukasi kesadaran/, "sec:edukasi"],
  [/penanganan insiden/, "sec:insiden"],
  [/peningkatan keamanan/, "sec:peningkatan"],
  [/proses bisnis/, "probisRaw"],
  [/^layanan/, "layananRaw"],
  [/^periode/, "periode"],
];

/** Sel referensi berisi "RAD.09.06.03 NAMA" — ambil kodenya saja. */
const radCode = (value: unknown) => String(value ?? "").match(/RAD(?:\.\d{2}){1,3}/i)?.[0].toUpperCase() ?? null;
const deepCode = (raw: string | null, rad: RabIndex) => {
  const found = raw?.match(/^RAD(?:\.\d{2}){4,5}/i)?.[0].toUpperCase();
  return found && rad.byCode.has(found) ? found : raw;
};
const parts = (raw: string | null) => (raw ?? "").split(/[\n;]+/).map((x) => x.trim()).filter(Boolean);

/** Teks pilihan → nilai tetap; `guessed` bila tidak sama persis dengan label template. */
function pick<T extends string>(raw: string | null, labels: Record<T, string>, guess: (v: string) => T | null): { value: T | null; guessed: boolean } {
  const v = (raw ?? "").toLowerCase().trim();
  if (!v) return { value: null, guessed: false };
  const exact = (Object.entries(labels) as [T, string][]).find(([key, label]) => v === key || v === label.toLowerCase());
  return exact ? { value: exact[0], guessed: false } : { value: guess(v), guessed: true };
}
export const toSifat = (raw: string | null) => pick<Sifat>(raw, sifatLabel, (v) => (/buka|publik|open/.test(v) ? "terbuka" : /tutup|rahasia/.test(v) ? "tertutup" : /batas|internal/.test(v) ? "terbatas" : null));
/** Dropdown template berisi "Data Statistik", "Data Geopasial", … */
export const toJenis = (raw: string | null) =>
  pick<Jenis>(raw?.replace(/^\s*data\s+/i, "") ?? null, jenisLabel, (v) => (/statistik/.test(v) ? "statistik" : /geo|spasial|peta/.test(v) ? "geopasial" : /keuangan|anggaran|finansial/.test(v) ? "keuangan" : "lainnya"));
export function toValiditas(raw: string | null): { value: string | null; guessed: boolean } {
  const v = (raw ?? "").toLowerCase().trim();
  if (!v) return { value: null, guessed: false };
  const exact = validitasOptions.find((o) => o.toLowerCase() === v);
  if (exact) return { value: exact, guessed: false };
  const loose = validitasOptions.find((o) => v.includes(o.toLowerCase())) ?? (/real|langsung/.test(v) ? "Realtime" : /triwulan/.test(v) ? "Tiga Bulanan" : /semester/.test(v) ? "Enam Bulanan" : "Lainnya");
  return { value: loose, guessed: true };
}
const toInterop = (raw: string | null) => {
  const v = (raw ?? "").toLowerCase().trim();
  return !v ? null : /^(ya|y|yes|true|1|sudah)/.test(v) ? true : /^(tidak|t|no|false|0|belum)/.test(v) ? false : null;
};

function parseSheet(data: Uint8Array): Raw[] {
  const book = XLSX.read(data, { type: "array" });
  const sheet = book.Sheets["Data dan Informasi"] ?? book.Sheets[book.SheetNames[0]!];
  const table = XLSX.utils.sheet_to_json<unknown[]>(sheet!, { header: 1, blankrows: false });
  const [head = [], ...body] = table;
  const map = new Map<number, Field>();
  head.forEach((cell, i) => {
    const h = normalize(cell);
    const hit = headers.find(([re]) => re.test(h));
    if (hit && ![...map.values()].includes(hit[1])) map.set(i, hit[1]);
  });
  if (![...map.values()].includes("name")) throw new Error("Kolom “Nama Data” tidak ditemukan. Pastikan memakai template Domain Arsitektur Data dan Informasi.");

  return body
    .map((cells, i) => {
      const get = (field: Field) => {
        for (const [col, f] of map) if (f === field) return cells[col];
        return undefined;
      };
      const opdRaw = text(get("opdRaw"));
      const produsenRaw = text(get("produsenRaw"));
      const period = text(get("periode"));
      const sifatRaw = text(get("sifatRaw"));
      const jenisRaw = text(get("jenisRaw"));
      const validitasRaw = text(get("validitasRaw"));
      const interopRaw = text(get("interopRaw"));
      return {
        line: i + 2,
        code: text(get("code")),
        name: text(get("name")) ?? "",
        uraian: text(get("uraian")),
        tujuan: text(get("tujuan")),
        opd: matchPd(opdRaw),
        opdRaw,
        produsen: matchPd(produsenRaw) ?? produsenRaw,
        output: text(get("output")),
        input: text(get("input")),
        period: period ? period.replace(/\s*[-–—]\s*/, "–") : "",
        sifat: toSifat(sifatRaw).value,
        sifatRaw,
        jenis: toJenis(jenisRaw).value,
        jenisRaw,
        validitas: toValiditas(validitasRaw).value,
        validitasRaw,
        interoperabel: toInterop(interopRaw),
        interopRaw,
        rad1: radCode(get("rad1")),
        rad2: radCode(get("rad2")),
        rad3: radCode(get("rad3")),
        rad: null,
        radL4: text(get("radL4")),
        radL5: text(get("radL5")),
        probisRaw: text(get("probisRaw")),
        layananRaw: text(get("layananRaw")),
        probis: [],
        layanan: [],
        security: Object.fromEntries(securityFields.map((f) => [f.key, parts(text(get(`sec:${f.key}`)))]).filter(([, v]) => v.length)),
      };
    })
    .filter((row) => row.name || row.rad3 || row.code);
}

export type DepRef = { code: string; name: string; opd: string; period: string };

/** Cocokkan isian dependensi (kode atau nama) ke daftar referensi periode yang sama; utamakan OPD yang sama. */
function matchRefs(raw: string | null, pool: DepRef[], opd: string | null) {
  const found: string[] = [];
  const missing: string[] = [];
  for (const part of parts(raw)) {
    const key = part.toLowerCase();
    const hit =
      pool.find((p) => p.code.toLowerCase() === key || key.startsWith(p.code.toLowerCase())) ??
      pool.find((p) => p.opd === opd && p.name.toLowerCase() === key) ??
      pool.find((p) => p.name.toLowerCase() === key);
    if (hit) found.push(hit.code);
    else missing.push(part);
  }
  return { found: [...new Set(found)], missing };
}

/** Validasi & normalisasi: L1/L2 diturunkan dari RAD L3, PD & dependensi dicocokkan, ID ganda ditandai. */
export function validateRows(
  rows: Raw[],
  {
    existing,
    lockedOpd,
    periods,
    radFor,
    probis,
    layanan,
  }: {
    existing: Set<string>;
    lockedOpd: string | null;
    periods: PeriodOptions;
    /** Referensi RAD milik periode baris. */
    radFor: (period: string) => RabIndex;
    probis: DepRef[];
    layanan: DepRef[];
  },
): DataImportRow[] {
  const seen = new Set<string>();
  return rows.map((row) => {
    const issues: ImportIssue[] = [];
    const next = { ...row, period: row.period || periods.active };
    if (!periods.periods.includes(next.period)) issues.push({ level: "error", message: `Periode “${next.period}” belum terdaftar` });
    const rad = radFor(next.period);
    next.radL4 = deepCode(row.radL4, rad);
    next.radL5 = deepCode(row.radL5, rad);
    if (!row.name || row.name.length < 3) issues.push({ level: "error", message: "Nama data kosong" });
    if (!row.uraian || row.uraian.length < 10) issues.push({ level: "error", message: "Uraian data kosong atau terlalu singkat" });
    if (!row.tujuan || row.tujuan.length < 10) issues.push({ level: "error", message: "Tujuan data kosong atau terlalu singkat" });

    // RAD terdalam: L3 bila diisi, selain itu L2 yang memang tidak memiliki turunan.
    const leaf = row.rad3 ?? (row.rad2 && !rad.children(row.rad2).length ? row.rad2 : null);
    const node = leaf ? rad.byCode.get(leaf) : undefined;
    if (!leaf) issues.push({ level: "error", message: row.rad2 ? "RAD Level 3 kosong" : "RAD kosong" });
    else if (!isRadLeaf(rad, leaf)) issues.push({ level: "error", message: `RAD “${leaf}” tidak dikenal` });
    else if (!rad.active(node)) issues.push({ level: "error", message: `RAD “${leaf}” sudah tidak berlaku` });
    else {
      const chain = node!.level === 3 ? [node!.parent!, rad.byCode.get(node!.parent!)!.parent!] : [node!.code, node!.parent!];
      const [l2, l1] = chain;
      if ((row.rad2 && row.rad2 !== l2) || (row.rad1 && row.rad1 !== l1)) issues.push({ level: "warning", message: `RAD L1/L2 disesuaikan dengan ${leaf} (${l1} › ${l2})` });
      next.rad = leaf;
      next.rad1 = l1!;
      next.rad2 = l2!;
      next.rad3 = node!.level === 3 ? leaf : null;
    }
    const deepIssue = (value: string | null, parent: string | null, level: number) => {
      if (!value) return;
      const known = rad.byCode.get(value);
      if ((known && known.parent !== parent) || (!known && rad.children(parent).length)) issues.push({ level: "error", message: `RAD Level ${level} bukan turunan ${parent ?? "level di atasnya"}` });
    };
    deepIssue(next.radL4, next.rad, 4);
    deepIssue(next.radL5, rad.byCode.get(next.radL4 ?? "")?.level === 4 ? next.radL4 : null, 5);

    const sifat = toSifat(row.sifatRaw);
    if (!sifat.value) issues.push({ level: "error", message: row.sifatRaw ? `Sifat “${row.sifatRaw}” tidak dikenali (Terbuka, Terbatas, Tertutup)` : "Sifat data kosong" });
    else if (sifat.guessed) issues.push({ level: "warning", message: `Sifat “${row.sifatRaw}” dibaca sebagai ${sifatLabel[sifat.value]}` });
    const jenis = toJenis(row.jenisRaw);
    if (!jenis.value) issues.push({ level: "error", message: "Jenis data kosong" });
    else if (jenis.guessed) issues.push({ level: "warning", message: `Jenis “${row.jenisRaw}” dibaca sebagai ${jenisLabel[jenis.value]}` });
    const validitas = toValiditas(row.validitasRaw);
    if (!validitas.value) issues.push({ level: "error", message: "Validitas data kosong" });
    else if (validitas.guessed) issues.push({ level: "warning", message: `Validitas “${row.validitasRaw}” dibaca sebagai ${validitas.value}` });
    if (row.interoperabel === null) issues.push({ level: "error", message: row.interopRaw ? `Interoperabilitas “${row.interopRaw}” harus Ya atau Tidak` : "Interoperabilitas kosong" });

    if (lockedOpd) {
      if (row.opd && row.opd !== lockedOpd) issues.push({ level: "error", message: "Wali data berbeda dengan OPD akun Anda" });
      else if (!row.opd) issues.push({ level: "warning", message: "Wali data diisi OPD akun Anda" });
      next.opd = lockedOpd;
    } else if (!row.opd) {
      issues.push({ level: "error", message: row.opdRaw ? `Wali data “${row.opdRaw}” tidak dikenal` : "Wali data kosong" });
    }

    // Probis adalah master (notulen): minimal satu proses bisnis harus cocok.
    const pb = matchRefs(row.probisRaw, probis.filter((p) => p.period === next.period), next.opd);
    next.probis = pb.found;
    if (pb.missing.length) issues.push({ level: "warning", message: `Proses bisnis tidak ditemukan: ${pb.missing.slice(0, 3).join(", ")}${pb.missing.length > 3 ? "…" : ""}` });
    if (!pb.found.length) issues.push({ level: "error", message: "Belum ada proses bisnis penghasil yang cocok" });
    const ly = matchRefs(row.layananRaw, layanan.filter((p) => p.period === next.period), next.opd);
    next.layanan = ly.found;
    if (ly.missing.length) issues.push({ level: "warning", message: `Layanan tidak ditemukan: ${ly.missing.slice(0, 3).join(", ")}${ly.missing.length > 3 ? "…" : ""}` });

    if (row.code) {
      if (seen.has(`${row.code}|${next.period}`)) issues.push({ level: "error", message: "ID ganda di dalam file" });
      else if (existing.has(`${row.code}|${next.period}`)) issues.push({ level: "warning", message: `ID sudah ada di periode ${next.period}` });
      seen.add(`${row.code}|${next.period}`);
    }
    return { ...next, sifat: sifat.value, jenis: jenis.value, validitas: validitas.value, issues };
  });
}

/** Baca unggahan .xlsx atau .zip (paket arsitektur semua domain) dan kembalikan baris mentah Data dan Informasi. */
export function readUpload(name: string, data: Uint8Array) {
  const unsupported: string[] = [];
  let file: { name: string; data: Uint8Array } | null = { name, data };
  if (name.toLowerCase().endsWith(".zip")) file = findInZip(data, unsupported, /data dan informasi|domain arsitektur data/);
  else if (!name.toLowerCase().endsWith(".xlsx")) throw new Error("Format berkas harus .xlsx atau .zip");
  return { file: file?.name ?? null, unsupported, rows: file ? parseSheet(file.data) : [] };
}
