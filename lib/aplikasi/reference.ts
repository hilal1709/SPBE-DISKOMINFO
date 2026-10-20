import { makeRabIndex, type RabNode, type RabSet } from "@/lib/probis/rab-index";
import { pdByCode, samplePeriods } from "@/lib/probis/reference";
import type { Aplikasi } from "@/lib/types";
import raaReference from "./raa-reference.json";

/** Referensi Domain Aplikasi (sumber: template analis "Domain Arsitektur Aplikasi.xlsx"). RAA baru sampai Level 2. */
export const sampleRaa = makeRabIndex(raaReference as RabNode[]);

/** Kumpulan RAA cadangan (database tidak tersedia): satu versi bawaan untuk semua periode contoh. */
export const sampleRaaSet: RabSet = {
  versions: [{ id: "bawaan", name: "Perpres 132/2022", nodes: sampleRaa.nodes }],
  periodVersion: Object.fromEntries(samplePeriods.map((p) => [p, "bawaan"])),
  activeVersion: "bawaan",
};

/** RAA yang boleh dipilih sebagai klasifikasi aplikasi: Level 3, atau Level 2 yang tidak memiliki turunan (saat ini semua L2). */
export const isRaaLeaf = (raa: { byCode: Map<string, RabNode>; children: (code: string) => RabNode[] }, code: string | null | undefined) => {
  const node = code ? raa.byCode.get(code) : undefined;
  return !!node && (node.level === 3 || (node.level === 2 && !raa.children(node.code).length));
};

/** Pilihan umum "Mesin Basis Data" (isian tetap bebas). */
export const mesinOptions = ["MySQL", "PostgreSQL", "MariaDB", "SQL Server", "Oracle", "MongoDB", "SQLite"];

export type Basis = Aplikasi["basis"];
/** Pilihan "Basis Aplikasi" template. */
export const basisOptions: { value: Basis; label: string }[] = [
  { value: "web", label: "Web Based" },
  { value: "mobile", label: "Mobile" },
  { value: "desktop", label: "Desktop" },
  { value: "cloud", label: "Cloud" },
];
export const basisLabel = Object.fromEntries(basisOptions.map((o) => [o.value, o.label])) as Record<Basis, string>;

export type Lisensi = Aplikasi["lisensi"];
export const lisensiOptions: { value: Lisensi; label: string }[] = [
  { value: "open_source", label: "Open Source" },
  { value: "proprietary", label: "Proprietary" },
];
export const lisensiLabel = Object.fromEntries(lisensiOptions.map((o) => [o.value, o.label])) as Record<Lisensi, string>;

export type Kepemilikan = Aplikasi["kepemilikan"];
export const kepemilikanOptions: { value: Kepemilikan; label: string }[] = [
  { value: "pemda", label: "Pemda" },
  { value: "pusat", label: "Instansi Pusat" },
  { value: "pihak_ketiga", label: "Pihak Ketiga" },
];
export const kepemilikanLabel = Object.fromEntries(kepemilikanOptions.map((o) => [o.value, o.label])) as Record<Kepemilikan, string>;
/** Warna seri kepemilikan, dipakai sama di alur, batang, dan badge. */
export const kepemilikanColor: Record<Kepemilikan, string> = { pemda: "--brand-teal", pusat: "--brand-orange", pihak_ketiga: "--brand-yellow" };

/** Kementerian/Lembaga pengembang aplikasi umum nasional. */
export const instansiPusat = [
  "Kementerian Dalam Negeri",
  "Kementerian PANRB",
  "Badan Kepegawaian Negara",
  "Arsip Nasional RI",
  "Kementerian Kesehatan",
  "Kementerian Sosial",
  "Kementerian Investasi/BKPM",
  "Kementerian PUPR",
  "Kementerian Keuangan",
  "LKPP",
  "Kementerian Pendidikan Dasar dan Menengah",
  "Badan Pusat Statistik",
  "Kementerian Komunikasi dan Digital",
  "Kementerian Pertanian",
];
const pusatSet = new Set(instansiPusat);

/** Kepemilikan diturunkan dari unit pengembang: PD Gresik → Pemda, K/L → Pusat, selain itu pihak ketiga. */
export function kepemilikanOf(pengembang: string): Kepemilikan {
  if (pdByCode.has(pengembang)) return "pemda";
  return pusatSet.has(pengembang) ? "pusat" : "pihak_ketiga";
}

/** Dependensi infrastruktur di template (urutan kolom). */
export const infraFields = [
  { key: "cloud", label: "Komputasi awan" },
  { key: "server", label: "Server" },
  { key: "splp", label: "Sistem Penghubung Layanan" },
  { key: "jip", label: "Jaringan Intra Pemerintah" },
] as const;
export type InfraKey = (typeof infraFields)[number]["key"];
