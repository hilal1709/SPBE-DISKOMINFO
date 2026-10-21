import type { Muatan } from "@/lib/peta-rencana/muatan";

/**
 * Aturan deteksi kesenjangan otomatis. AS-IS = data tervalidasi tiap domain; target = kondisi ideal arsitektur SPBE.
 * Rancangan sendiri berdasarkan notulen 1 Juli 2026 (data analis belum memuat template Gap Analysis).
 */

export const ruleKeys = [
  "probis_tanpa_aplikasi",
  "probis_tanpa_layanan",
  "layanan_belum_digital",
  "aplikasi_tanpa_infra",
  "aplikasi_tanpa_keamanan",
  "data_tidak_interoperabel",
  "data_tanpa_aplikasi",
  "standar_kedaluwarsa",
] as const;
export type GapRule = (typeof ruleKeys)[number];

/** `subject` = jenis entri yang diperiksa (untuk tautan & label). */
export const ruleConfig: Record<GapRule, { label: string; domain: Muatan; subject: string; target: string }> = {
  probis_tanpa_aplikasi: { label: "Probis baru/upgrade belum didukung aplikasi", domain: "aplikasi", subject: "Proses bisnis", target: "Proses bisnis didukung aplikasi yang selaras" },
  probis_tanpa_layanan: { label: "Probis belum menghasilkan layanan", domain: "layanan", subject: "Proses bisnis", target: "Proses bisnis menghasilkan layanan yang terdaftar" },
  layanan_belum_digital: { label: "Layanan belum elektronik", domain: "layanan", subject: "Layanan", target: "Layanan diselenggarakan secara elektronik" },
  aplikasi_tanpa_infra: { label: "Aplikasi belum tercatat di infrastruktur", domain: "infrastruktur", subject: "Aplikasi", target: "Aplikasi berjalan di infrastruktur yang tercatat (pusat data/cloud)" },
  aplikasi_tanpa_keamanan: { label: "Aplikasi tanpa standar/audit keamanan", domain: "keamanan", subject: "Aplikasi", target: "Aplikasi menerapkan standar keamanan dan diaudit" },
  data_tidak_interoperabel: { label: "Data belum interoperabel", domain: "data", subject: "Data", target: "Data interoperabel dan tersedia di Satu Data" },
  data_tanpa_aplikasi: { label: "Data belum dikelola aplikasi", domain: "data", subject: "Data", target: "Data dihasilkan atau dipakai aplikasi" },
  standar_kedaluwarsa: { label: "Standar keamanan kedaluwarsa", domain: "tata_kelola", subject: "Standar keamanan", target: "Standar & prosedur keamanan berlaku" },
};

export const priorityKeys = ["tinggi", "sedang", "rendah"] as const;
export type GapPriority = (typeof priorityKeys)[number];
export const priorityConfig: Record<GapPriority, { label: string; tone: string }> = {
  tinggi: { label: "Tinggi", tone: "--brand-orange" },
  sedang: { label: "Sedang", tone: "--brand-yellow" },
  rendah: { label: "Rendah", tone: "--brand-sky" },
};

export const gapStatusKeys = ["terbuka", "diusulkan", "ditindaklanjuti", "diabaikan"] as const;
export type GapStatus = (typeof gapStatusKeys)[number];
export const gapStatusConfig: Record<GapStatus, { label: string; tone: string }> = {
  terbuka: { label: "Terbuka", tone: "--brand-orange" },
  diusulkan: { label: "Diusulkan", tone: "--brand-amber" },
  ditindaklanjuti: { label: "Ditindaklanjuti", tone: "--brand-teal" },
  diabaikan: { label: "Diabaikan", tone: "--brand-sky" },
};
