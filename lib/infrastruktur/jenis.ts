import type { IllustrationName } from "@/components/illustrations/illustration";

/**
 * Sepuluh komponen Domain Arsitektur Infrastruktur (satu workbook template analis per komponen).
 * Konfigurasi ini sumber tunggal untuk form, impor, ekspor, detail, dan dashboard: kolom bersama ada di tabel,
 * kolom khusus tiap komponen disimpan di `atribut` (jsonb) dengan kunci di bawah.
 */

export const jenisKeys = ["fasilitas", "cloud", "server", "jaringan", "perangkat_keamanan", "penyimpanan", "periferal", "platform", "jip", "splp"] as const;
export type InfraJenis = (typeof jenisKeys)[number];

/** Kolom khusus: teks bebas, pilihan tetap (boleh diisi lain), atau teks panjang. */
export type AttrField = {
  key: string;
  label: string;
  type: "text" | "select" | "textarea";
  options?: string[];
  placeholder?: string;
  /** Header template (sudah dinormalisasi) yang dibaca sebagai kolom ini. */
  match: RegExp;
  /** Ditampilkan hanya bila kolom lain bernilai tertentu (mis. jenis OS hanya untuk tipe Sistem operasi). */
  when?: { key: string; value: string };
  /** Angka yang dijumlahkan di dashboard. */
  metric?: "storage" | "bandwidth" | "memory";
};

/** Relasi yang boleh diisi komponen ini: ke komponen infrastruktur lain atau ke domain lain. */
export type Relasi = InfraJenis | "aplikasi" | "data" | "probis";

export type JenisConfig = {
  label: string;
  /** Label pendek untuk grafik & chip. */
  short: string;
  /** Lapisan RAI Level 1. */
  layer: "RAI.01" | "RAI.02" | "RAI.03";
  /** RAI Level 2 bawaan saat komponen dipilih. */
  rai: string;
  /** Nama workbook/sheet template analis. */
  workbook: string;
  /** Header kolom nama di template. */
  nameHeader: string;
  /** Kolom bersama yang ada di template komponen ini. */
  common: ("deskripsi" | "pemilik" | "kepemilikan" | "pengelola")[];
  attrs: AttrField[];
  relasi: Relasi[];
  /** Fungsi perangkat keamanan (template: "→ … (Function)"). */
  fungsi?: InfraJenis[];
  illustration: IllustrationName;
  /** Warna token kartu & seri grafik. */
  tone: string;
};

const lokasi = (match: RegExp, label = "Lokasi"): AttrField => ({ key: "lokasi", label, type: "text", placeholder: "mis. Data Center Diskominfo, Lt. 2", match });

export const jenisConfig: Record<InfraJenis, JenisConfig> = {
  fasilitas: {
    label: "Fasilitas Komputasi",
    short: "Fasilitas",
    layer: "RAI.01",
    rai: "RAI.01.02",
    workbook: "Fasilitas Komputasi",
    nameHeader: "Nama Fasilitas Komputasi",
    common: ["kepemilikan", "pengelola"],
    attrs: [
      { key: "bandwidthIntranet", label: "Bandwidth intranet", type: "text", placeholder: "mis. 1 Gbps", match: /^bandwidth intranet/, metric: "bandwidth" },
      { key: "bandwidthInternet", label: "Bandwidth internet", type: "text", placeholder: "mis. 500 Mbps", match: /^bandwidth internet/, metric: "bandwidth" },
      lokasi(/^lokasi/),
      { key: "tier", label: "Klasifikasi tier", type: "select", options: ["Tier I", "Tier II", "Tier III", "Tier IV"], match: /tier/ },
      { key: "pengamanan", label: "Sistem pengamanan fasilitas", type: "textarea", placeholder: "mis. akses kartu, CCTV 24 jam, pemadam gas FM-200", match: /sistem pengamanan/ },
    ],
    relasi: ["splp", "jip"],
    illustration: "data-center",
    tone: "--brand-teal",
  },
  cloud: {
    label: "Komputasi Awan",
    short: "Cloud",
    layer: "RAI.03",
    rai: "RAI.03.02",
    workbook: "Komputasi Awan",
    nameHeader: "Nama Government Cloud",
    common: ["deskripsi", "pemilik", "kepemilikan"],
    attrs: [
      { key: "tipe", label: "Tipe government cloud", type: "select", options: ["Private cloud", "Public cloud", "Hybrid cloud", "Community cloud"], match: /^tipe gov/ },
      { key: "biaya", label: "Biaya layanan", type: "text", placeholder: "mis. Rp 12.000.000/tahun", match: /^biaya/ },
      { key: "pengembang", label: "Unit pengembang", type: "text", placeholder: "mis. Kementerian Komunikasi dan Digital", match: /unit pengembang/ },
      { key: "operasional", label: "Unit operasional", type: "text", placeholder: "mis. Bidang Infrastruktur TIK", match: /unit operasional/ },
      { key: "jangkaWaktu", label: "Jangka waktu pelayanan", type: "text", placeholder: "mis. 2025–2027", match: /jangka waktu/ },
    ],
    relasi: ["aplikasi", "data", "splp", "fasilitas", "jip"],
    illustration: "data-center",
    tone: "--brand-sky",
  },
  server: {
    label: "Perangkat Keras Server",
    short: "Server",
    layer: "RAI.03",
    rai: "RAI.03.01",
    workbook: "Perangkat Keras Server",
    nameHeader: "Nama Server",
    common: ["deskripsi", "pemilik", "kepemilikan", "pengelola"],
    attrs: [
      { key: "penggunaan", label: "Jenis penggunaan", type: "select", options: ["Aplikasi", "Basis data", "Web", "Berkas", "Cadangan", "Virtualisasi"], match: /jenis penggunaan/ },
      { key: "prosesor", label: "Teknologi prosesor", type: "text", placeholder: "mis. Intel Xeon Silver 4314, 16 core", match: /prosesor/ },
      { key: "memori", label: "Kapasitas memori", type: "text", placeholder: "mis. 128 GB", match: /kapasitas memori/, metric: "memory" },
      { key: "penyimpanan", label: "Kapasitas penyimpanan", type: "text", placeholder: "mis. 4 TB", match: /kapasitas penyimpanan/, metric: "storage" },
      { key: "teknik", label: "Teknik penyimpanan", type: "select", options: ["DAS", "NAS", "SAN"], match: /teknik penyimpanan/ },
      lokasi(/^lokasi/),
    ],
    relasi: ["platform", "probis", "fasilitas"],
    illustration: "data-center",
    tone: "--brand-amber",
  },
  jaringan: {
    label: "Perangkat Keras Jaringan",
    short: "Jaringan",
    layer: "RAI.03",
    rai: "RAI.03.01",
    workbook: "Perangkat Keras Jaringan",
    nameHeader: "Nama Network/Communication Device",
    common: ["deskripsi", "pemilik", "kepemilikan", "pengelola"],
    attrs: [{ key: "tipe", label: "Tipe perangkat", type: "select", options: ["Router", "Switch", "Access point", "Modem", "Load balancer"], match: /^tipe (network|perangkat)/ }],
    relasi: ["fasilitas", "platform", "server", "penyimpanan"],
    illustration: "data-center",
    tone: "--brand-orange",
  },
  perangkat_keamanan: {
    label: "Perangkat Keras Keamanan",
    short: "Perangkat keamanan",
    layer: "RAI.03",
    rai: "RAI.03.01",
    workbook: "Perangkat Keras Keamanan",
    nameHeader: "Nama Perangkat Keamanan",
    common: ["deskripsi", "pemilik", "kepemilikan", "pengelola"],
    attrs: [{ key: "tipe", label: "Tipe perangkat keamanan", type: "select", options: ["Firewall", "IDS/IPS", "WAF", "VPN gateway", "Anti-DDoS"], match: /^tipe (security|perangkat)/ }],
    relasi: ["fasilitas", "jaringan"],
    fungsi: ["cloud", "penyimpanan", "server", "platform"],
    illustration: "security-shield",
    tone: "--brand-yellow",
  },
  penyimpanan: {
    label: "Perangkat Keras Media Penyimpan",
    short: "Penyimpanan",
    layer: "RAI.03",
    rai: "RAI.03.01",
    workbook: "Perangkat Keras Media Penyimpan",
    nameHeader: "Nama Data Storage",
    common: ["deskripsi", "pemilik", "kepemilikan", "pengelola"],
    attrs: [
      { key: "kapasitas", label: "Kapasitas penyimpanan", type: "text", placeholder: "mis. 40 TB", match: /^kapasitas/, metric: "storage" },
      { key: "akses", label: "Metode akses berbagi data", type: "select", options: ["NFS", "SMB/CIFS", "iSCSI", "FTP/SFTP", "Object storage (S3)"], match: /metode akses/ },
      lokasi(/^lokasi/),
    ],
    relasi: ["data", "platform", "server", "fasilitas"],
    illustration: "data-center",
    tone: "--brand-teal",
  },
  periferal: {
    label: "Perangkat Keras Periferal",
    short: "Periferal",
    layer: "RAI.03",
    rai: "RAI.03.01",
    workbook: "Perangkat Keras Periferal",
    nameHeader: "Nama Perangkat Periferal",
    common: ["deskripsi", "pengelola"],
    attrs: [
      { key: "tipe", label: "Tipe periferal", type: "select", options: ["UPS", "CCTV", "Printer", "Pemindai", "Videotron", "Proyektor"], match: /^tipe periferal/ },
      lokasi(/^lokasi/, "Lokasi penempatan"),
    ],
    relasi: ["fasilitas", "penyimpanan", "server", "platform"],
    illustration: "data-center",
    tone: "--brand-sky",
  },
  platform: {
    label: "Perangkat Lunak Platform",
    short: "Platform",
    layer: "RAI.03",
    rai: "RAI.03.01",
    workbook: "Perangkat Lunak Platform",
    nameHeader: "Nama Perangkat Lunak",
    common: ["deskripsi"],
    attrs: [
      { key: "tipe", label: "Tipe perangkat lunak", type: "select", options: ["Sistem operasi", "Sistem database", "Sistem utilitas"], match: /^tipe perangkat lunak/ },
      { key: "jenisOs", label: "Jenis sistem operasi", type: "text", placeholder: "mis. Ubuntu Server 22.04", match: /jenis sistem operasi/, when: { key: "tipe", value: "Sistem operasi" } },
      { key: "jenisDb", label: "Jenis sistem database", type: "text", placeholder: "mis. PostgreSQL 16", match: /jenis sistem database/, when: { key: "tipe", value: "Sistem database" } },
      { key: "jenisUtilitas", label: "Jenis sistem utilitas", type: "text", placeholder: "mis. VMware vSphere", match: /jenis sistem utilitas/, when: { key: "tipe", value: "Sistem utilitas" } },
      { key: "lisensi", label: "Jenis lisensi", type: "select", options: ["Open source", "Proprietary"], match: /^jenis lisensi/ },
      { key: "pemilikLisensi", label: "Pemilik lisensi", type: "text", placeholder: "mis. Diskominfo", match: /pemilik lisensi/ },
      { key: "validitas", label: "Validitas lisensi", type: "text", placeholder: "mis. s.d. Desember 2027", match: /validitas/ },
    ],
    relasi: ["cloud", "fasilitas"],
    illustration: "data-center",
    tone: "--brand-orange",
  },
  jip: {
    label: "Jaringan Intra Pemerintah",
    short: "JIP",
    layer: "RAI.02",
    rai: "RAI.02.01",
    workbook: "Jaringan Intra Pemerintah",
    nameHeader: "Nama Jaringan",
    common: ["deskripsi", "pemilik", "kepemilikan", "pengelola"],
    attrs: [
      { key: "jenis", label: "Jenis jaringan", type: "select", options: ["Intranet", "Internet", "VPN", "MPLS", "Metro-E"], match: /^jenis jaringan/ },
      { key: "bandwidth", label: "Bandwidth", type: "text", placeholder: "mis. 100 Mbps", match: /^bandwidth/, metric: "bandwidth" },
      { key: "media", label: "Tipe media jaringan", type: "select", options: ["Fiber optik", "Kabel tembaga", "Radio", "Satelit"], match: /tipe media/ },
      { key: "mediaLain", label: "Media lainnya", type: "text", match: /media lainnya/ },
    ],
    relasi: ["splp", "data"],
    illustration: "data-center",
    tone: "--brand-amber",
  },
  splp: {
    label: "Sistem Penghubung Layanan Pemerintah",
    short: "SPLP",
    layer: "RAI.02",
    rai: "RAI.02.02",
    workbook: "Sistem Penghubung Layanan Pemerintah",
    nameHeader: "Nama Sistem Penghubung Layanan Pemerintah",
    common: ["deskripsi", "pemilik", "kepemilikan"],
    attrs: [{ key: "jenis", label: "Jenis sistem penghubung", type: "select", options: ["API gateway", "Enterprise service bus", "Message broker", "Integrasi data"], match: /^jenis sistem penghubung/ }],
    relasi: ["jip", "aplikasi", "data"],
    illustration: "data-center",
    tone: "--brand-yellow",
  },
};

export const jenisLabel = Object.fromEntries(jenisKeys.map((k) => [k, jenisConfig[k].label])) as Record<InfraJenis, string>;
export const jenisOptions = jenisKeys.map((k) => ({ value: k, label: jenisConfig[k].label }));

/** Lapisan RAI Level 1 (template: Fasilitas Komputasi, Sistem Integrasi, Platform). */
export const layers = [
  { code: "RAI.01", label: "Fasilitas Komputasi", jenis: jenisKeys.filter((k) => jenisConfig[k].layer === "RAI.01") },
  { code: "RAI.02", label: "Sistem Integrasi", jenis: jenisKeys.filter((k) => jenisConfig[k].layer === "RAI.02") },
  { code: "RAI.03", label: "Platform", jenis: jenisKeys.filter((k) => jenisConfig[k].layer === "RAI.03") },
] as const;

/** Status kepemilikan komponen (template: "Status Kepemilikan"/"Kepemilikan"). */
export const kepemilikanOptions = [
  { value: "milik_sendiri", label: "Milik sendiri" },
  { value: "sewa", label: "Sewa" },
  { value: "instansi_lain", label: "Instansi lain" },
  { value: "pihak_ketiga", label: "Pihak ketiga" },
] as const;
export type InfraKepemilikan = (typeof kepemilikanOptions)[number]["value"];
export const kepemilikanLabel = Object.fromEntries(kepemilikanOptions.map((o) => [o.value, o.label])) as Record<InfraKepemilikan, string>;
export const kepemilikanColor: Record<InfraKepemilikan, string> = { milik_sendiri: "--brand-teal", sewa: "--brand-amber", instansi_lain: "--brand-sky", pihak_ketiga: "--brand-orange" };

/** Teks bebas → status kepemilikan; null bila tidak dikenali. */
export function toKepemilikan(raw: string | null): InfraKepemilikan | null {
  const v = (raw ?? "").toLowerCase().trim();
  if (!v) return null;
  const exact = kepemilikanOptions.find((o) => o.value === v || o.label.toLowerCase() === v);
  if (exact) return exact.value;
  if (/sewa|langgan|kontrak/.test(v)) return "sewa";
  if (/pihak ketiga|vendor|swasta|penyedia/.test(v)) return "pihak_ketiga";
  if (/instansi lain|pusat|kementerian|pinjam|hibah|lain/.test(v)) return "instansi_lain";
  if (/sendiri|milik|pemda|aset/.test(v)) return "milik_sendiri";
  return null;
}

export const relasiLabel: Record<Relasi, string> = { ...jenisLabel, aplikasi: "Aplikasi", data: "Data dan Informasi", probis: "Proses Bisnis" };

/** Kolom relasi template → relasi (header dinormalisasi tanpa panah). */
export const relasiMatch: [RegExp, Relasi][] = [
  [/^fasilitas komputasi/, "fasilitas"],
  [/^komputasi awan/, "cloud"],
  [/^sistem penghubung layanan/, "splp"],
  [/^jaringan intra pemerintah/, "jip"],
  [/^perangkat keras jaringan/, "jaringan"],
  [/^perangkat keras server/, "server"],
  [/^perangkat keras media penyimpan/, "penyimpanan"],
  [/^perangkat lunak platform/, "platform"],
  [/^aplikasi/, "aplikasi"],
  [/^data dan informasi/, "data"],
  [/proses bisnis/, "probis"],
];

/** Komponen yang bisa ditautkan dari komponen `jenis` (relasi + fungsi), tanpa domain lain. */
export const infraTargets = (jenis: InfraJenis) => [...new Set([...jenisConfig[jenis].relasi, ...(jenisConfig[jenis].fungsi ?? [])])].filter((r): r is InfraJenis => (jenisKeys as readonly string[]).includes(r));

/** Komponen dari nama workbook/sheet/header "Component:…" template analis. */
export function jenisFromName(name: string): InfraJenis | null {
  const v = name.toLowerCase();
  if (/media penyimpan/.test(v)) return "penyimpanan";
  if (/perangkat keras keamanan/.test(v)) return "perangkat_keamanan";
  if (/perangkat keras jaringan/.test(v)) return "jaringan";
  if (/perangkat keras server/.test(v)) return "server";
  if (/periferal/.test(v)) return "periferal";
  if (/perangkat lunak platform|^platform$/.test(v)) return "platform";
  if (/komputasi awan/.test(v)) return "cloud";
  if (/fasilitas komputasi/.test(v)) return "fasilitas";
  if (/jaringan intra|\bjip\b/.test(v)) return "jip";
  if (/penghubung layanan|\bsplp\b/.test(v)) return "splp";
  return null;
}

/** "4 TB", "512 GB" → GB; "1 Gbps", "500 Mbps" → Mbps. Null bila tidak terbaca. */
export function parseMetric(raw: string | null | undefined, metric: NonNullable<AttrField["metric"]>): number | null {
  const m = String(raw ?? "").replace(",", ".").match(/([\d.]+)\s*([kmgtp]?)\s*(b|bps|byte)?/i);
  if (!m) return null;
  const value = Number(m[1]);
  if (!Number.isFinite(value)) return null;
  const unit = m[2]!.toLowerCase();
  if (metric === "bandwidth") return value * ({ k: 0.001, m: 1, g: 1000, t: 1_000_000 }[unit] ?? 1);
  return value * ({ m: 1 / 1024, g: 1, t: 1024, p: 1024 * 1024 }[unit] ?? 1);
}

/** Ringkas angka: 2048 GB → "2 TB", 1500 Mbps → "1,5 Gbps". */
export function formatMetric(value: number, metric: NonNullable<AttrField["metric"]>) {
  const fmt = (n: number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(n);
  if (metric === "bandwidth") return value >= 1000 ? `${fmt(value / 1000)} Gbps` : `${fmt(value)} Mbps`;
  if (value >= 1024 * 1024) return `${fmt(value / 1024 / 1024)} PB`;
  return value >= 1024 ? `${fmt(value / 1024)} TB` : `${fmt(value)} GB`;
}

/** Nama sheet ekspor/template (Excel maksimal 31 karakter; SPLP memakai singkatannya). */
export const sheetName = (jenis: InfraJenis) => (jenisConfig[jenis].workbook.length > 31 ? jenisConfig[jenis].short : jenisConfig[jenis].workbook);
