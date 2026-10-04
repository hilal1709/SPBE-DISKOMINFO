import { revalidatePath } from "next/cache";

/** Hasil server action CMS: data, atau pesan galat (+ galat per kolom form). */
export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string; fields?: Record<string, string> };

export const fail = (error: unknown): { ok: false; error: string } => ({ ok: false, error: error instanceof Error ? error.message : "Terjadi kesalahan." });

/** Muat ulang CMS dan dashboard publik setelah data berubah. */
export function refresh() {
  revalidatePath("/cms", "layout");
  revalidatePath("/");
  revalidatePath("/layanan");
}
