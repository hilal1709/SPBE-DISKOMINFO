import * as XLSX from "xlsx";
import { findInZip, matchPd, normalize, text } from "@/lib/probis/import";
import type { RabIndex } from "@/lib/probis/rab-index";
import type { PeriodOptions } from "@/lib/probis/reference";
import { metodeLabel, targetLabel, type Metode, type Target } from "./reference";

export type ImportIssue = { level: "error" | "warning"; message: string };
export type LayananImportRow = {
  line: number;
  code: string | null;
  name: string;
  tujuan: string | null;
  fungsi: string | null;
  opd: string | null;
  opdRaw: string | null;
  period: string;
  target: Target | null;
  targetRaw: string | null;
  metode: Metode | null;
  metodeRaw: string | null;
  ral1: string | null;
  ral2: string | null;
  ral3: string | null;
  ralL4: string | null;
  ralL5: string | null;
  rab2: string | null;
  manfaat: string | null;
  ekonomi: string | null;
  risiko: string | null;
  mitigasi: string | null;
  kl: string | null;
  /** Isian sel "← Proses Bisnis" (kode atau nama, dipisah baris/titik koma). */
  probisRaw: string | null;
  /** Kode probis hasil pencocokan. */
  probis: string[];
  issues: ImportIssue[];
};
export type LayananImportResult = { file: string | null; unsupported: string[]; rows: LayananImportRow[] };

type Raw = Omit<LayananImportRow, "issues">;
type Field = "name" | "code" | "tujuan" | "fungsi" | "rab2" | "targetRaw" | "manfaat" | "ekonomi" | "ralL4" | "ralL5" | "metodeRaw" | "kl" | "ral1" | "ral2" | "ral3" | "opdRaw" | "risiko" | "mitigasi" | "probisRaw" | "periode";

/** Pencocokan header template "Domain Arsitektur Layanan.xlsx" (header panjang berisi petunjuk, jadi cocokkan awalannya). */
const headers: [RegExp, Field][] = [
  [/^nama layanan/, "name"],
  [/^id$|^id layanan/, "code"],
  [/^tujuan/, "tujuan"],
  [/^fungsi/, "fungsi"],
  [/rab level 2|^urusan pemerintahan/, "rab2"],
  [/^target layanan/, "targetRaw"],
  [/^potensi manfaat/, "manfaat"],
  [/^potensi ekonomi/, "ekonomi"],
  [/ral level 4/, "ralL4"],
  [/ral level 5/, "ralL5"],
  [/^metode layanan/, "metodeRaw"],
  [/kementerian|lembaga/, "kl"],
  [/ral level 1/, "ral1"],
  [/ral level 2/, "ral2"],
  [/ral level 3/, "ral3"],
  [/unit pelaksana|unit kerja|perangkat daerah/, "opdRaw"],
  [/^potensi resiko|^potensi risiko/, "risiko"],
  [/^mitigasi/, "mitigasi"],
  [/proses bisnis/, "probisRaw"],
  [/^periode/, "periode"],
];

/** Sel referensi berisi "RAL.01.23.01 NAMA" — ambil kodenya saja. */
const code = (prefix: "RAL" | "RAB", value: unknown) => String(value ?? "").match(new RegExp(`${prefix}(?:\\.\\d{2}){1,3}`, "i"))?.[0].toUpperCase() ?? null;
const deepCode = (raw: string | null, ral: RabIndex) => {
  const found = raw?.match(/^RAL(?:\.\d{2}){4,5}/i)?.[0].toUpperCase();
  return found && ral.byCode.has(found) ? found : raw;
};

/** Teks target bebas → pilihan tetap. `guessed` bila tidak sama persis dengan label. */
export function toTarget(raw: string | null): { value: Target | null; guessed: boolean } {
  const v = (raw ?? "").toLowerCase().trim();
  if (!v) return { value: null, guessed: false };
  const exact = (Object.entries(targetLabel) as [Target, string][]).find(([key, label]) => v === key || v === label.toLowerCase());
  if (exact) return { value: exact[0], guessed: false };
  const value: Target | null = /usaha|investor|industri|umkm|koperasi/.test(v) ? "usaha" : /asn|pegawai|pns/.test(v) ? "asn" : /pemerintah|perangkat|opd|instansi|desa/.test(v) ? "pemerintah" : /masyarakat|warga|penduduk|publik|umum/.test(v) ? "masyarakat" : null;
  return { value, guessed: true };
}

/** Teks metode bebas → pilihan tetap. `guessed` bila tidak sama persis dengan label. */
export function toMetode(raw: string | null): { value: Metode | null; guessed: boolean } {
  const v = (raw ?? "").toLowerCase().trim();
  if (!v) return { value: null, guessed: false };
  const exact = (Object.entries(metodeLabel) as [Metode, string][]).find(([key, label]) => v === key || v === label.toLowerCase());
  if (exact) return { value: exact[0], guessed: false };
  const online = /elektronik|online|daring|digital|aplikasi|web|sistem/.test(v);
  const offline = /tatap|manual|langsung|luring|offline|loket|datang/.test(v);
  return { value: online && offline ? "hybrid" : /hybrid|campur/.test(v) ? "hybrid" : online ? "elektronik" : offline ? "tatap_muka" : null, guessed: true };
}

function parseSheet(data: Uint8Array): Raw[] {
  const book = XLSX.read(data, { type: "array" });
  const sheet = book.Sheets["Layanan"] ?? book.Sheets[book.SheetNames[0]!];
  const table = XLSX.utils.sheet_to_json<unknown[]>(sheet!, { header: 1, blankrows: false });
  const [head = [], ...body] = table;
  const map = new Map<number, Field>();
  head.forEach((cell, i) => {
    const h = normalize(cell);
    const hit = headers.find(([re]) => re.test(h));
    if (hit && ![...map.values()].includes(hit[1])) map.set(i, hit[1]);
  });
  if (![...map.values()].includes("name")) throw new Error("Kolom “Nama Layanan” tidak ditemukan. Pastikan memakai template Domain Arsitektur Layanan.");

  return body
    .map((cells, i) => {
      const get = (field: Field) => {
        for (const [col, f] of map) if (f === field) return cells[col];
        return undefined;
      };
      const opdRaw = text(get("opdRaw"));
      const period = text(get("periode"));
      const targetRaw = text(get("targetRaw"));
      const metodeRaw = text(get("metodeRaw"));
      return {
        line: i + 2,
        code: text(get("code")),
        name: text(get("name")) ?? "",
        tujuan: text(get("tujuan")),
        fungsi: text(get("fungsi")),
        opd: matchPd(opdRaw),
        opdRaw,
        period: period ? period.replace(/\s*[-–—]\s*/, "–") : "",
        target: toTarget(targetRaw).value,
        targetRaw,
        metode: toMetode(metodeRaw).value,
        metodeRaw,
        ral1: code("RAL", get("ral1")),
        ral2: code("RAL", get("ral2")),
        ral3: code("RAL", get("ral3")),
        ralL4: text(get("ralL4")),
        ralL5: text(get("ralL5")),
        rab2: code("RAB", get("rab2")),
        manfaat: text(get("manfaat")),
        ekonomi: text(get("ekonomi")),
        risiko: text(get("risiko")),
        mitigasi: text(get("mitigasi")),
        kl: text(get("kl")),
        probisRaw: text(get("probisRaw")),
        probis: [],
      };
    })
    .filter((row) => row.name || row.ral3 || row.code);
}

export type ProbisRef = { code: string; name: string; opd: string; period: string };

/** Validasi & normalisasi: L1/L2 diturunkan dari RAL L3, PD & probis dicocokkan, ID ganda ditandai. */
export function validateRows(
  rows: Raw[],
  {
    existing,
    lockedOpd,
    periods,
    ralFor,
    rabFor,
    probis,
  }: {
    existing: Set<string>;
    lockedOpd: string | null;
    periods: PeriodOptions;
    /** Referensi RAL & RAB milik periode baris. */
    ralFor: (period: string) => RabIndex;
    rabFor: (period: string) => RabIndex;
    /** Probis yang ada (untuk mencocokkan kolom "← Proses Bisnis"). */
    probis: ProbisRef[];
  },
): LayananImportRow[] {
  const seen = new Set<string>();
  return rows.map((row) => {
    const issues: ImportIssue[] = [];
    const next = { ...row, period: row.period || periods.active };
    if (!periods.periods.includes(next.period)) issues.push({ level: "error", message: `Periode “${next.period}” belum terdaftar` });
    const ral = ralFor(next.period);
    const rab = rabFor(next.period);
    next.ralL4 = deepCode(row.ralL4, ral);
    next.ralL5 = deepCode(row.ralL5, ral);
    if (!row.name || row.name.length < 3) issues.push({ level: "error", message: "Nama layanan kosong" });
    if (!row.tujuan || row.tujuan.length < 10) issues.push({ level: "error", message: "Tujuan layanan kosong atau terlalu singkat" });

    const l3 = row.ral3 ? ral.byCode.get(row.ral3) : undefined;
    if (!row.ral3) issues.push({ level: "error", message: "RAL Level 3 kosong" });
    else if (l3?.level !== 3) issues.push({ level: "error", message: `RAL Level 3 “${row.ral3}” tidak dikenal` });
    else if (!ral.active(l3)) issues.push({ level: "error", message: `RAL Level 3 “${row.ral3}” sudah tidak berlaku` });
    else {
      const l2 = l3.parent!;
      const l1 = ral.byCode.get(l2)!.parent!;
      if ((row.ral2 && row.ral2 !== l2) || (row.ral1 && row.ral1 !== l1)) issues.push({ level: "warning", message: `RAL L1/L2 disesuaikan dengan L3 (${l1} › ${l2})` });
      next.ral1 = l1;
      next.ral2 = l2;
    }
    const deepIssue = (value: string | null, parent: string | null, level: number) => {
      if (!value) return;
      const known = ral.byCode.get(value);
      if ((known && known.parent !== parent) || (!known && ral.children(parent).length)) issues.push({ level: "error", message: `RAL Level ${level} bukan turunan ${parent ?? "level di atasnya"}` });
    };
    deepIssue(next.ralL4, next.ral3, 4);
    deepIssue(next.ralL5, ral.byCode.get(next.ralL4 ?? "")?.level === 4 ? next.ralL4 : null, 5);

    if (row.rab2 && rab.byCode.get(row.rab2)?.level !== 2) {
      issues.push({ level: "warning", message: `Urusan “${row.rab2}” tidak dikenal, dikosongkan` });
      next.rab2 = null;
    }

    const target = toTarget(row.targetRaw);
    if (!target.value) issues.push({ level: "error", message: row.targetRaw ? `Target “${row.targetRaw}” tidak dikenali (Masyarakat, Pelaku Usaha, ASN/Pegawai, Pemerintah)` : "Target layanan kosong" });
    else if (target.guessed) issues.push({ level: "warning", message: `Target “${row.targetRaw}” dibaca sebagai ${targetLabel[target.value]}` });
    const metode = toMetode(row.metodeRaw);
    if (!metode.value) issues.push({ level: "error", message: row.metodeRaw ? `Metode “${row.metodeRaw}” tidak dikenali (Elektronik, Hybrid, Tatap muka)` : "Metode layanan kosong" });
    else if (metode.guessed) issues.push({ level: "warning", message: `Metode “${row.metodeRaw}” dibaca sebagai ${metodeLabel[metode.value]}` });
    if (row.risiko && !row.mitigasi) issues.push({ level: "error", message: "Risiko diisi tanpa mitigasi" });

    if (lockedOpd) {
      if (row.opd && row.opd !== lockedOpd) issues.push({ level: "error", message: "Unit pelaksana berbeda dengan OPD akun Anda" });
      else if (!row.opd) issues.push({ level: "warning", message: "Unit pelaksana diisi OPD akun Anda" });
      next.opd = lockedOpd;
    } else if (!row.opd) {
      issues.push({ level: "error", message: row.opdRaw ? `Unit pelaksana “${row.opdRaw}” tidak dikenal` : "Unit pelaksana kosong" });
    }

    // "← Proses Bisnis": cocokkan kode atau nama probis di periode yang sama (utamakan OPD yang sama).
    if (row.probisRaw) {
      const pool = probis.filter((p) => p.period === next.period);
      const found: string[] = [];
      const missing: string[] = [];
      for (const part of row.probisRaw.split(/[\n;]+/).map((x) => x.trim()).filter(Boolean)) {
        const key = part.toLowerCase();
        const hit =
          pool.find((p) => p.code.toLowerCase() === key || key.startsWith(p.code.toLowerCase())) ??
          pool.find((p) => p.opd === next.opd && p.name.toLowerCase() === key) ??
          pool.find((p) => p.name.toLowerCase() === key);
        if (hit) found.push(hit.code);
        else missing.push(part);
      }
      next.probis = [...new Set(found)];
      if (missing.length) issues.push({ level: "warning", message: `Proses bisnis tidak ditemukan: ${missing.slice(0, 3).join(", ")}${missing.length > 3 ? "…" : ""}` });
    }

    if (row.code) {
      if (seen.has(`${row.code}|${next.period}`)) issues.push({ level: "error", message: "ID ganda di dalam file" });
      else if (existing.has(`${row.code}|${next.period}`)) issues.push({ level: "warning", message: `ID sudah ada di periode ${next.period}` });
      seen.add(`${row.code}|${next.period}`);
    }
    return { ...next, target: target.value, metode: metode.value, issues };
  });
}

/** Baca unggahan .xlsx atau .zip (paket arsitektur) dan kembalikan baris mentah Layanan. */
export function readUpload(name: string, data: Uint8Array) {
  const unsupported: string[] = [];
  let file: { name: string; data: Uint8Array } | null = { name, data };
  if (name.toLowerCase().endsWith(".zip")) file = findInZip(data, unsupported, /layanan/);
  else if (!name.toLowerCase().endsWith(".xlsx")) throw new Error("Format berkas harus .xlsx atau .zip");
  return { file: file?.name ?? null, unsupported, rows: file ? parseSheet(file.data) : [] };
}
