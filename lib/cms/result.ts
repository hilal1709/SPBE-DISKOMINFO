import { revalidatePath } from "next/cache";
import { expire, TAGS } from "@/lib/cache";
import { broadcastChange } from "@/lib/realtime/server";

/** Hasil server action CMS: data, atau pesan galat (+ galat per kolom form). */
export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string; fields?: Record<string, string> };

/** Galat database/sistem (punya SQLSTATE `code`, mis. dari pg) tidak dikirim mentah ke peramban: nama tabel/constraint bisa bocor. */
const isInternal = (error: Error) => typeof (error as { code?: unknown }).code === "string" || error.name !== "Error";

export const fail = (error: unknown): { ok: false; error: string } => {
  if (error instanceof Error && !isInternal(error)) return { ok: false, error: error.message };
  console.error("[cms] Galat server action:", error);
  return { ok: false, error: "Terjadi kesalahan sistem. Coba lagi atau hubungi admin Diskominfo." };
};

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
