import { getDb } from "@/lib/db";

export type AuthEvent = "login" | "login_failed" | "login_locked" | "password_changed" | "password_reset" | "password_change_failed";

/** Jejak audit autentikasi (migrasi 020). Best-effort: kegagalan menulis log tidak boleh menggagalkan login/ganti sandi. */
export async function logAuthEvent(event: AuthEvent, { userId, email, ip }: { userId?: string | null; email?: string | null; ip?: string | null }) {
  await getDb()
    ?.query("insert into auth_events (user_id, email, event, ip) values ($1, $2, $3, $4)", [userId ?? null, email ?? null, event, ip ?? null])
    .catch((error) => console.error("[audit] Gagal mencatat auth_events (jalankan migrasi 020):", error instanceof Error ? error.message : error));
}
