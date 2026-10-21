/**
 * Muatan (fokus arsitektur) kegiatan Peta Rencana dan status pelaksanaannya. Kelompok muatan mengikuti Peta Rencana
 * SPBE Gresik 2025–2029 (Manajemen, Layanan, Infrastruktur, Aplikasi, Tata Kelola, Audit, Keamanan) ditambah Data.
 */

export const muatanKeys = ["aplikasi", "layanan", "data", "infrastruktur", "keamanan", "tata_kelola", "manajemen", "audit"] as const;
export type Muatan = (typeof muatanKeys)[number];

/** `abbr` = singkatan di ID otomatis: GSK-PRN {abbr}.{urutan}. `tone` = token warna seri grafik. */
export const muatanConfig: Record<Muatan, { label: string; abbr: string; tone: string }> = {
  aplikasi: { label: "Aplikasi", abbr: "APL", tone: "--brand-teal" },
  layanan: { label: "Layanan", abbr: "LAY", tone: "--brand-sky" },
  data: { label: "Data", abbr: "DAT", tone: "--brand-yellow" },
  infrastruktur: { label: "Infrastruktur", abbr: "INF", tone: "--brand-amber" },
  keamanan: { label: "Keamanan", abbr: "KAM", tone: "--brand-orange" },
  tata_kelola: { label: "Tata Kelola", abbr: "TKL", tone: "--brand-teal" },
  manajemen: { label: "Manajemen", abbr: "MNJ", tone: "--brand-sky" },
  audit: { label: "Audit", abbr: "AUD", tone: "--brand-yellow" },
};

export const muatanOptions = muatanKeys.map((value) => ({ value, label: muatanConfig[value].label }));

/** Muatan dari label bebas (impor): "Tata Kelola" → tata_kelola. */
export const muatanFromLabel = (label: string) => {
  const key = label.trim().toLowerCase().replace(/\s+/g, "_");
  return (muatanKeys as readonly string[]).includes(key) ? (key as Muatan) : null;
};

export const statusKeys = ["direncanakan", "berjalan", "terlaksana", "ditunda", "batal"] as const;
export type RencanaStatus = (typeof statusKeys)[number];

export const statusConfig: Record<RencanaStatus, { label: string; tone: string }> = {
  direncanakan: { label: "Direncanakan", tone: "--brand-sky" },
  berjalan: { label: "Berjalan", tone: "--brand-amber" },
  terlaksana: { label: "Terlaksana", tone: "--brand-teal" },
  ditunda: { label: "Ditunda", tone: "--brand-yellow" },
  batal: { label: "Batal", tone: "--brand-orange" },
};

export const statusOptions = statusKeys.map((value) => ({ value, label: statusConfig[value].label }));

export const statusFromLabel = (label: string) => statusKeys.find((k) => statusConfig[k].label.toLowerCase() === label.trim().toLowerCase()) ?? null;

export const sourceKeys = ["manual", "gap", "usulan_tertunda"] as const;
export type RencanaSource = (typeof sourceKeys)[number];

/** Asal usulan (notulen 1 Juli 2026): hasil gap analysis, atau usulan OPD yang dialihkan dari tahun sebelumnya. */
export const sourceLabel: Record<RencanaSource, string> = { manual: "Diinput langsung", gap: "Hasil gap analysis", usulan_tertunda: "Usulan tertunda" };
