import type { SecurityKey } from "@/lib/data/reference";

/**
 * Tujuh kegiatan Domain Arsitektur Keamanan (satu workbook template analis per kegiatan). Kuncinya sama dengan
 * `securityFields` (dependensi keamanan di template Data, Aplikasi, dan Infrastruktur), sehingga cakupan dependensi
 * domain lain bisa dibandingkan langsung dengan kegiatan keamanan yang tercatat.
 */

export const kegiatanKeys = ["standar", "edukasi", "kerentanan", "peningkatan", "insiden", "audit", "kelaikan"] as const satisfies readonly SecurityKey[];
export type Kegiatan = (typeof kegiatanKeys)[number];

export type KegiatanField = {
  key: string;
  label: string;
  type: "text" | "select" | "textarea" | "date" | "score";
  options?: string[];
  placeholder?: string;
  /** Header template (sudah dinormalisasi) yang dibaca sebagai kolom ini. */
  match: RegExp;
};

export type KegiatanConfig = {
  label: string;
  short: string;
  /** Kelompok folder template analis. */
  group: "standar" | "penerapan" | "kelaikan";
  /** Singkatan di ID otomatis: GSK-KAM {abbr}.{urutan}. */
  abbr: string;
  workbook: string;
  nameHeader: string;
  /** Label kolom tanggal (Standar: tanggal mulai penerapan). */
  dateLabel: string;
  attrs: KegiatanField[];
  tone: string;
};

export const kegiatanConfig: Record<Kegiatan, KegiatanConfig> = {
  standar: {
    label: "Standar Teknis dan Prosedur Keamanan SPBE",
    short: "Standar & prosedur",
    group: "standar",
    abbr: "STD",
    workbook: "Standar Teknis dan Prosedur Keamanan SPBE",
    nameHeader: "Nama",
    dateLabel: "Tanggal mulai penerapan",
    attrs: [
      { key: "jenis", label: "Jenis standar keamanan", type: "select", options: ["Peraturan bupati", "Standar teknis", "Prosedur operasional (SOP)", "Pedoman", "Kebijakan"], match: /jenis standar/ },
      { key: "akhir", label: "Tanggal akhir penerapan", type: "date", placeholder: "Kosongkan bila masih berlaku", match: /tanggal akhir/ },
    ],
    tone: "--brand-teal",
  },
  edukasi: {
    label: "Edukasi Kesadaran Keamanan SPBE",
    short: "Edukasi kesadaran",
    group: "penerapan",
    abbr: "EDU",
    workbook: "Edukasi Kesadaran Keamanan SPBE",
    nameHeader: "Nama Kegiatan Edukasi Kesadaran Keamanan SPBE",
    dateLabel: "Tanggal kegiatan",
    attrs: [],
    tone: "--brand-sky",
  },
  kerentanan: {
    label: "Identifikasi Kerentanan Keamanan SPBE",
    short: "Identifikasi kerentanan",
    group: "penerapan",
    abbr: "KRT",
    workbook: "Identifikasi Kerentanan Keamanan SPBE",
    nameHeader: "Nama Kegiatan Identifikasi Kerentanan Keamanan SPBE",
    dateLabel: "Tanggal kegiatan",
    attrs: [],
    tone: "--brand-yellow",
  },
  peningkatan: {
    label: "Peningkatan Keamanan SPBE",
    short: "Peningkatan",
    group: "penerapan",
    abbr: "PNK",
    workbook: "Peningkatan Keamanan SPBE",
    nameHeader: "Nama Kegiatan Peningkatan Keamanan SPBE",
    dateLabel: "Tanggal kegiatan",
    attrs: [],
    tone: "--brand-amber",
  },
  insiden: {
    label: "Penanganan Insiden Keamanan SPBE",
    short: "Penanganan insiden",
    group: "penerapan",
    abbr: "INS",
    workbook: "Penanganan Insiden Keamanan SPBE",
    nameHeader: "Nama Kegiatan Penanganan Insiden Keamanan SPBE",
    dateLabel: "Tanggal kegiatan",
    attrs: [{ key: "kematangan", label: "Nilai kematangan penanganan insiden", type: "score", placeholder: "1–5", match: /kematangan/ }],
    tone: "--brand-orange",
  },
  audit: {
    label: "Audit Keamanan SPBE",
    short: "Audit",
    group: "penerapan",
    abbr: "AUD",
    workbook: "Audit Keamanan SPBE",
    nameHeader: "Nama Kegiatan Audit Keamanan SPBE",
    dateLabel: "Tanggal kegiatan",
    attrs: [
      { key: "jenis", label: "Jenis audit keamanan", type: "select", options: ["Audit internal", "Audit eksternal", "Audit oleh BSSN", "Penilaian mandiri"], match: /jenis audit/ },
      { key: "hasil", label: "Hasil audit", type: "textarea", placeholder: "Temuan utama dan kategori risikonya", match: /hasil audit/ },
      { key: "tindakLanjut", label: "Tindak lanjut", type: "textarea", placeholder: "Rencana atau status perbaikan temuan", match: /tindak lanjut/ },
    ],
    tone: "--brand-teal",
  },
  kelaikan: {
    label: "Kelaikan Keamanan SPBE",
    short: "Kelaikan",
    group: "kelaikan",
    abbr: "KLK",
    workbook: "Kelaikan Keamanan SPBE",
    nameHeader: "Nama Kegiatan Kelaikan Keamanan SPBE",
    dateLabel: "Tanggal kelaikan",
    attrs: [],
    tone: "--brand-sky",
  },
};

export const kegiatanLabel = Object.fromEntries(kegiatanKeys.map((k) => [k, kegiatanConfig[k].label])) as Record<Kegiatan, string>;
export const kegiatanOptions = kegiatanKeys.map((k) => ({ value: k, label: kegiatanConfig[k].short }));

/** Kelompok folder template analis. */
export const groups = [
  { key: "standar", label: "Standar Teknis dan Prosedur", jenis: kegiatanKeys.filter((k) => kegiatanConfig[k].group === "standar") },
  { key: "penerapan", label: "Penerapan Keamanan", jenis: kegiatanKeys.filter((k) => kegiatanConfig[k].group === "penerapan") },
  { key: "kelaikan", label: "Kelaikan Keamanan", jenis: kegiatanKeys.filter((k) => kegiatanConfig[k].group === "kelaikan") },
] as const;

/** Kegiatan dari nama workbook/sheet/header "Component:…" template analis (nama sheet terpotong 31 karakter). */
export function kegiatanFromName(name: string): Kegiatan | null {
  const v = name.toLowerCase();
  if (/standar teknis|prosedur keamanan|^standar/.test(v)) return "standar";
  if (/edukasi/.test(v)) return "edukasi";
  if (/kerentanan/.test(v)) return "kerentanan";
  if (/peningkatan/.test(v)) return "peningkatan";
  if (/insiden/.test(v)) return "insiden";
  if (/audit/.test(v)) return "audit";
  if (/kelaikan/.test(v)) return "kelaikan";
  return null;
}

/** Standar masih berlaku: tanpa tanggal akhir atau tanggal akhir belum lewat. */
export const masihBerlaku = (r: { jenis: Kegiatan; atribut: Record<string, string> }, today = new Date().toISOString().slice(0, 10)) => r.jenis === "standar" && (!r.atribut.akhir || r.atribut.akhir >= today);

/** Nama sheet ekspor/template (Excel maksimal 31 karakter). */
export const sheetName = (k: Kegiatan) => (kegiatanConfig[k].workbook.length > 31 ? kegiatanConfig[k].short : kegiatanConfig[k].workbook);
