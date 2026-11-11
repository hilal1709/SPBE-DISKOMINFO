/**
 * Muatan (fokus arsitektur) kegiatan Peta Rencana dan status pelaksanaannya. Kelompok muatan mengikuti Peta Rencana
 * SPBE Gresik 2025–2029 (Manajemen, Layanan, Infrastruktur, Aplikasi, Tata Kelola, Audit, Keamanan) ditambah Data.
 */

/** Muatan bawaan; daftar yang berlaku dikelola di CMS (tabel `muatan`). Gap analysis tetap memakai domain bawaan ini. */
export const muatanKeys = ["aplikasi", "layanan", "data", "infrastruktur", "keamanan", "tata_kelola", "manajemen", "audit"] as const;
export type DefaultMuatan = (typeof muatanKeys)[number];
/** Kunci muatan kegiatan: bebas (dikelola di CMS), bukan lagi daftar tetap. */
export type Muatan = string;

export type MuatanDef = { key: string; label: string; abbr: string; tone: string };

/** `abbr` = singkatan di ID otomatis: GSK-PRN {abbr}.{urutan}. `tone` = token warna seri grafik. */
export const muatanConfig: Record<DefaultMuatan, { label: string; abbr: string; tone: string }> = {
  aplikasi: { label: "Aplikasi", abbr: "APL", tone: "--brand-teal" },
  layanan: { label: "Layanan", abbr: "LAY", tone: "--brand-sky" },
  data: { label: "Data", abbr: "DAT", tone: "--brand-yellow" },
  infrastruktur: { label: "Infrastruktur", abbr: "INF", tone: "--brand-amber" },
  keamanan: { label: "Keamanan", abbr: "KAM", tone: "--brand-orange" },
  tata_kelola: { label: "Tata Kelola", abbr: "TKL", tone: "--brand-teal" },
  manajemen: { label: "Manajemen", abbr: "MNJ", tone: "--brand-sky" },
  audit: { label: "Audit", abbr: "AUD", tone: "--brand-yellow" },
};

export const defaultMuatan: MuatanDef[] = muatanKeys.map((key) => ({ key, ...muatanConfig[key] }));

/** Warna yang bisa dipilih untuk muatan baru (token merek). */
export const muatanTones = [
  { value: "--brand-teal", label: "Teal" },
  { value: "--brand-sky", label: "Biru muda" },
  { value: "--brand-yellow", label: "Kuning" },
  { value: "--brand-amber", label: "Amber" },
  { value: "--brand-orange", label: "Oranye" },
] as const;

/** Kunci muatan dari label: "Tata Kelola" → tata_kelola. */
export const muatanKeyOf = (label: string) =>
  label.trim().toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

/** Daftar muatan yang berlaku beserta pencarian. Muatan yang sudah dihapus tetap terbaca (label = kunci). */
export function muatanBook(list: MuatanDef[]) {
  const byKey = new Map(list.map((m) => [m.key, m]));
  const get = (key: string): MuatanDef => byKey.get(key) ?? { key, label: key, abbr: key.slice(0, 3).toUpperCase(), tone: "--brand-teal" };
  return {
    list,
    keys: list.map((m) => m.key),
    get,
    options: list.map((m) => ({ value: m.key, label: m.label })),
    /** Muatan dari label atau kunci bebas (impor): "Tata Kelola" → tata_kelola. */
    fromLabel: (label: string) => {
      const text = label.trim().toLowerCase();
      return list.find((m) => m.key === muatanKeyOf(label) || m.label.toLowerCase() === text)?.key ?? null;
    },
  };
}
export type MuatanBook = ReturnType<typeof muatanBook>;

export const defaultMuatanBook = muatanBook(defaultMuatan);

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
