import { revalidatePath } from "next/cache";
import { expire, TAGS } from "@/lib/cache";
import { broadcastChange } from "@/lib/realtime/server";

/** Hasil server action CMS: data, atau pesan galat (+ galat per kolom form). */
export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string; fields?: Record<string, string> };

export const fail = (error: unknown): { ok: false; error: string } => ({ ok: false, error: error instanceof Error ? error.message : "Terjadi kesalahan." });

/**
 * Muat ulang CMS dan dashboard publik setelah data berubah. `reference` = periode atau referensi berversi
 * ikut berubah (isian juga, karena pemetaan ulang menyentuh isian).
 */
export function refresh({ reference = false }: { reference?: boolean } = {}) {
  expire(TAGS.content, ...(reference ? [TAGS.reference] : []));
  revalidatePath("/cms", "layout");
  revalidatePath("/");
  revalidatePath("/layanan");
  revalidatePath("/data");
  revalidatePath("/aplikasi");
  revalidatePath("/infrastruktur");
  revalidatePath("/keamanan");
  revalidatePath("/peta-rencana");
  broadcastChange(reference ? "reference" : "content");
}
