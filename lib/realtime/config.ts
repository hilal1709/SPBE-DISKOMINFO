/** Kanal publik tunggal: isinya hanya sinyal "ada perubahan", data tetap dibaca ulang lewat hak akses masing-masing. */
export const REALTIME_CHANNEL = "spbe";
export const REALTIME_EVENT = "changed";

/** `content` = isian domain, `reference` = periode/referensi berversi, `access` = akun, peran, dan hak akses. */
export type ChangeScope = "content" | "reference" | "access";

export type ChangeEvent = { scope: ChangeScope; at: number };
