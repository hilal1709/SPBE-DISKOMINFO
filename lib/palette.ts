/**
 * Warna kategori untuk visual multi-seri (treemap, rekap, ranking), diambil bergiliran dari palet aktif
 * seperti referensi dashboard: teal/aqua, oranye/koral, kuning, biru muda/sage, amber/emas.
 * Oranye dan amber dipisah agar dua rona hangat yang mirip tidak bersebelahan.
 * Nilainya nama token, jadi ikut berganti saat tema CMS aktif. Charcoal tidak dipakai karena teks di atasnya gelap.
 */
export const categorical = ["--brand-teal", "--brand-orange", "--brand-yellow", "--brand-sky", "--brand-amber"] as const;

export type CategoryColor = (typeof categorical)[number];

export const categoryColor = (index: number): CategoryColor => categorical[((index % categorical.length) + categorical.length) % categorical.length]!;

/** Warna per kode (urutan = urutan warna), agar satu sektor/jenis berwarna sama di semua widget. */
export function colorByRoot(rootCodes: string[]) {
  const index = new Map(rootCodes.map((code, i) => [code, i]));
  return (code: string | undefined) => categoryColor(code ? (index.get(code) ?? 0) : 0);
}

/** Urutkan kode dari yang terbanyak, supaya kategori terbesar mendapat warna berbeda-beda dan palet tersebar rata. */
export function colorByCount<T>(rows: T[], key: (row: T) => string | null | undefined) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const code = key(row);
    if (code) counts.set(code, (counts.get(code) ?? 0) + 1);
  }
  return colorByRoot([...counts].sort((a, b) => b[1] - a[1]).map(([code]) => code));
}
