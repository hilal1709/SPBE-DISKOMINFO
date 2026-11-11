import type { DomainKey } from "@/lib/domains";
import type { DefaultMuatan } from "@/lib/peta-rencana/muatan";

/**
 * Aturan deteksi kesenjangan otomatis. AS-IS = data tervalidasi tiap domain; target = kondisi ideal arsitektur SPBE.
 * Rancangan sendiri berdasarkan notulen 1 Juli 2026 (data analis belum memuat template Gap Analysis).
 */

/** Rantai analisis gap (notulen Diskominfo): Probis → Layanan → Data → Aplikasi → Infrastruktur → Keamanan. */
export const chainStages = ["layanan", "data", "aplikasi", "infrastruktur", "keamanan"] as const;
export type ChainStage = (typeof chainStages)[number];
export const chainLabel: Record<ChainStage, string> = { layanan: "Layanan", data: "Data", aplikasi: "Aplikasi", infrastruktur: "Infrastruktur", keamanan: "Keamanan" };

/** Urut mengikuti rantai: tiap aturan memeriksa satu mata rantai (`stage` = tahap yang seharusnya tersambung). */
export const ruleKeys = [
  "probis_tanpa_layanan",
  "layanan_belum_digital",
  "layanan_tanpa_data",
  "data_tidak_interoperabel",
  "probis_tanpa_aplikasi",
  "layanan_tanpa_aplikasi",
  "data_tanpa_aplikasi",
  "aplikasi_tanpa_infra",
  "aplikasi_tanpa_keamanan",
  "infra_tanpa_keamanan",
  "standar_kedaluwarsa",
] as const;
export type GapRule = (typeof ruleKeys)[number];

/** `subject` = jenis entri yang diperiksa (label); `subjectDomain` = domain arsitekturnya (untuk tautan ke Peta Rencana). */
export const ruleConfig: Record<GapRule, { label: string; domain: DefaultMuatan; stage: ChainStage; subject: string; subjectDomain: DomainKey; target: string }> = {
  probis_tanpa_layanan: { label: "Probis belum menghasilkan layanan", domain: "layanan", stage: "layanan", subject: "Proses bisnis", subjectDomain: "probis", target: "Proses bisnis menghasilkan layanan yang terdaftar" },
  layanan_belum_digital: { label: "Layanan belum elektronik", domain: "layanan", stage: "layanan", subject: "Layanan", subjectDomain: "layanan", target: "Layanan diselenggarakan secara elektronik" },
  layanan_tanpa_data: { label: "Layanan belum memiliki data", domain: "data", stage: "data", subject: "Layanan", subjectDomain: "layanan", target: "Layanan menghasilkan atau memakai data yang terdaftar" },
  data_tidak_interoperabel: { label: "Data belum interoperabel", domain: "data", stage: "data", subject: "Data", subjectDomain: "data", target: "Data interoperabel dan tersedia di Satu Data" },
  probis_tanpa_aplikasi: { label: "Probis baru/upgrade belum didukung aplikasi", domain: "aplikasi", stage: "aplikasi", subject: "Proses bisnis", subjectDomain: "probis", target: "Proses bisnis didukung aplikasi yang selaras" },
  layanan_tanpa_aplikasi: { label: "Layanan belum didukung aplikasi", domain: "aplikasi", stage: "aplikasi", subject: "Layanan", subjectDomain: "layanan", target: "Layanan didukung aplikasi yang terdaftar" },
  data_tanpa_aplikasi: { label: "Data belum dikelola aplikasi", domain: "data", stage: "aplikasi", subject: "Data", subjectDomain: "data", target: "Data dihasilkan atau dipakai aplikasi" },
  aplikasi_tanpa_infra: { label: "Aplikasi belum tercatat di infrastruktur", domain: "infrastruktur", stage: "infrastruktur", subject: "Aplikasi", subjectDomain: "aplikasi", target: "Aplikasi berjalan di infrastruktur yang tercatat (pusat data/cloud)" },
  aplikasi_tanpa_keamanan: { label: "Aplikasi tanpa standar/audit keamanan", domain: "keamanan", stage: "keamanan", subject: "Aplikasi", subjectDomain: "aplikasi", target: "Aplikasi menerapkan standar keamanan dan diaudit" },
  infra_tanpa_keamanan: { label: "Infrastruktur tanpa kegiatan keamanan", domain: "keamanan", stage: "keamanan", subject: "Infrastruktur", subjectDomain: "infrastruktur", target: "Komponen infrastruktur tercakup kegiatan Keamanan SPBE" },
  standar_kedaluwarsa: { label: "Standar keamanan kedaluwarsa", domain: "tata_kelola", stage: "keamanan", subject: "Standar keamanan", subjectDomain: "keamanan", target: "Standar & prosedur keamanan berlaku" },
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
