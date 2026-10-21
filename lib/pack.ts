/**
 * Daftar baris yang dikemas ringkas untuk dikirim server → klien (dan disimpan di cache).
 * Nama kolom ditulis sekali, dan nilai teks yang berulang (OPD, periode, sasaran, IKU, kode referensi, …)
 * disimpan sekali di kamus lalu dirujuk dengan indeks. Ribuan baris menyusut ±60%.
 */
export type Packed<T> = {
  cols: string[];
  /** Kolom yang nilainya indeks kamus (semua nilainya teks atau kosong). */
  text: boolean[];
  dict: string[];
  rows: unknown[][];
  /** Penanda tipe saja; tidak pernah diisi. */
  __type?: T;
};

export function pack<T extends object>(list: readonly T[]): Packed<T> {
  const cols = [...new Set(list.flatMap((row) => Object.keys(row)))];
  const values = (row: T) => cols.map((c) => (row as Record<string, unknown>)[c] ?? null);
  const raw = list.map(values);
  const text = cols.map((_, i) => raw.every((r) => r[i] === null || typeof r[i] === "string"));
  const dict: string[] = [];
  const index = new Map<string, number>();
  const ref = (s: string) => {
    let i = index.get(s);
    if (i === undefined) index.set(s, (i = dict.push(s) - 1));
    return i;
  };
  const rows = raw.map((r) => r.map((v, i) => (text[i] && typeof v === "string" ? ref(v) : v)));
  return { cols, text, dict, rows };
}

export function unpack<T>({ cols, text, dict, rows }: Packed<T>): T[] {
  return rows.map((r) => {
    const row: Record<string, unknown> = {};
    cols.forEach((c, i) => (row[c] = text[i] && typeof r[i] === "number" ? dict[r[i] as number] : r[i]));
    return row as T;
  });
}
