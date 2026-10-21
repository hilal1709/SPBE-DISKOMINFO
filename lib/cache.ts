import { unstable_cache, updateTag } from "next/cache";

/**
 * Cache data lintas request (server saja). Setiap query ke database memakan ±100 ms, jadi bacaan yang sama
 * untuk semua pengguna disimpan dan dibuang lewat tag saat CMS menyimpan perubahan.
 * Hasil di-serialisasi JSON: kembalikan objek polos (tanggal sebagai string ISO, tanpa Map/Set).
 */
export const TAGS = {
  /** Isian semua domain (probis, layanan, data, aplikasi, infrastruktur, keamanan, peta rencana, gap). */
  content: "spbe:content",
  /** Periode arsitektur dan referensi berversi RAB/RAL/RAD/RAA/RAI + referensi keamanan. */
  reference: "spbe:reference",
} as const;

/** Batas usia cache bila data diubah di luar aplikasi (seed, SQL langsung). */
const MAX_AGE = 60;

export function cached<A extends unknown[], R>(fn: (...args: A) => Promise<R>, key: string, tags: readonly string[]) {
  return unstable_cache(fn, [key], { tags: [...tags], revalidate: MAX_AGE });
}

/** Buang cache setelah server action menyimpan; request berikutnya langsung membaca data baru. */
export function expire(...tags: string[]) {
  for (const tag of tags) updateTag(tag);
}
