import { can, type Actor } from "@/lib/permissions";
import type { SubmissionStatus } from "@/lib/types";

/** Status awal baris impor dari klien: hanya draf atau diajukan (tervalidasi tetap lewat alur review). */
export function importStatus(status: unknown): "draft" | "submitted" {
  if (status !== "draft" && status !== "submitted") throw new Error("Status impor tidak valid.");
  return status;
}

/** Impor hanya boleh menimpa rekaman yang boleh disunting aktor (OPD sendiri, status draf/dikembalikan). */
export function assertImportUpdate(actor: Actor, existing: { code: string; status: SubmissionStatus; opd_id: string | null }) {
  if (!can.edit(actor, { status: existing.status, opdId: existing.opd_id })) {
    throw new Error(`ID ${existing.code} milik OPD lain atau sedang/sudah ditinjau, sehingga tidak dapat ditimpa lewat impor.`);
  }
}

/** Dicek ulang di dalam transaksi (baris terkunci): status bisa berubah (mis. disetujui) sejak halaman sunting dibuka. */
export function assertStillEditable(actor: Actor, status: SubmissionStatus) {
  if (!can.edit(actor, { status, opdId: actor.opdId })) throw new Error("Status rekaman sudah berubah sehingga tidak dapat disunting. Muat ulang halaman.");
}

/** Pilihan ajukan juga berlaku pada data lama; simpan draf tidak menarik status review yang sudah ada. */
export function importUpdateStatus(current: SubmissionStatus, requested: SubmissionStatus): SubmissionStatus {
  return importStatus(requested) === "submitted" ? "submitted" : current;
}
