import { matchRefs, type DepRef } from "@/lib/data/import";

/**
 * Kolom aliran data aplikasi (inputan & luaran data) menyimpan kode data dipisah baris; isian lama dari sebelum
 * tautan ke modul Data tetap disimpan apa adanya.
 */
export const flowLines = (value: string | null | undefined) => (value ?? "").split("\n").map((v) => v.trim()).filter(Boolean);

/** Teks tampilan: "kode nama" untuk kode yang dikenal, selain itu teks aslinya. */
export const flowLabels = (value: string | null | undefined, names: Record<string, string>) => flowLines(value).map((v) => (names[v] ? `${v} ${names[v]}` : v));

/** Isian impor (kode atau nama data, dipisah baris/titik koma) → kode data periode yang sama; yang tidak cocok tetap teks. */
export function resolveFlow(raw: string | null, pool: DepRef[], opd: string | null) {
  if (!raw) return null;
  const { found, missing } = matchRefs(raw, pool, opd);
  return [...found, ...missing].join("\n") || null;
}
