/**
 * Warna kategori untuk visual multi-seri (treemap, rekap, ranking), diambil bergiliran dari palet aktif
 * seperti referensi dashboard: koral/oranye, teal/aqua, kuning, amber/emas, biru muda/sage.
 * Nilainya nama token, jadi ikut berganti saat tema CMS aktif. Charcoal tidak dipakai karena teks di atasnya gelap.
 */
export const categorical = ["--brand-orange", "--brand-teal", "--brand-yellow", "--brand-amber", "--brand-sky"] as const;

export type CategoryColor = (typeof categorical)[number];

export const categoryColor = (index: number): CategoryColor => categorical[((index % categorical.length) + categorical.length) % categorical.length]!;

/** Warna per kode level 1 (urut kode), agar satu sektor/jenis berwarna sama di semua widget. */
export function colorByRoot(rootCodes: string[]) {
  const index = new Map(rootCodes.map((code, i) => [code, i]));
  return (code: string | undefined) => categoryColor(code ? (index.get(code) ?? 0) : 0);
}
