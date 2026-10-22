import { createHash, randomBytes } from "node:crypto";
import { getDb } from "@/lib/db";

/** Sesi berakhir mutlak 8 jam setelah masuk dan bila tidak aktif 30 menit (dicek di lib/pengguna/repo.ts sessionAccess). */
export const SESSION_MAX_AGE_SEC = 8 * 60 * 60;
export const SESSION_IDLE_MIN = 30;

/** Yang disimpan di DB hanya hash id sesi: isi tabel sessions yang bocor tidak bisa dipakai sebagai id sesi. */
export const sessionHash = (sid: string) => createHash("sha256").update(sid).digest("hex");

function db() {
  const pool = getDb();
  if (!pool) throw new Error("Database belum dikonfigurasi (DATABASE_URL).");
  return pool;
}

/** Sesi baru saat login berhasil; id acak 256-bit dikembalikan untuk disimpan di JWT. Galat dilempar (login gagal-tertutup). */
export async function createSession(userId: string, { ip, userAgent }: { ip: string; userAgent: string | null }) {
  const sid = randomBytes(32).toString("base64url");
  await db().query(
    "insert into sessions (id, user_id, expires_at, ip, user_agent) values ($1, $2, now() + make_interval(secs => $3), $4, $5)",
    [sessionHash(sid), userId, SESSION_MAX_AGE_SEC, ip === "unknown" ? null : ip, userAgent?.slice(0, 300) ?? null],
  );
  // Bersihkan sesi lama sesekali agar tabel tidak tumbuh terus (tanpa cron).
  if (Math.random() < 0.05) void db().query("delete from sessions where expires_at < now() - interval '7 days'").catch(() => undefined);
  return sid;
}

/** Logout: sesi ini tidak berlaku lagi walau JWT-nya masih tersimpan di tempat lain. */
export async function revokeSession(sid: string) {
  await getDb()?.query("update sessions set revoked_at = now() where id = $1 and revoked_at is null", [sessionHash(sid)]);
}

/** Cabut semua sesi akun (ganti/reset sandi, nonaktif), kecuali sesi `keepSid` bila diberikan. */
export async function revokeUserSessions(userId: string, keepSid?: string) {
  await getDb()?.query("update sessions set revoked_at = now() where user_id = $1 and revoked_at is null and id <> $2", [
    userId,
    keepSid ? sessionHash(keepSid) : "",
  ]);
}

export type ActiveSession = { id: string; createdAt: string; lastSeenAt: string; ip: string | null; userAgent: string | null; current: boolean };

/** Sesi aktif milik pengguna (untuk /akun/sesi). `id` = hash, bukan id sesi asli. */
export async function listSessions(userId: string, currentSid: string): Promise<ActiveSession[]> {
  const current = sessionHash(currentSid);
  const { rows } = await db().query<{ id: string; created_at: Date; last_seen_at: Date; ip: string | null; user_agent: string | null }>(
    `select id, created_at, last_seen_at, ip, user_agent from sessions
     where user_id = $1 and revoked_at is null and expires_at > now() and last_seen_at > now() - make_interval(mins => $2)
     order by last_seen_at desc`,
    [userId, SESSION_IDLE_MIN],
  );
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.created_at.toISOString(),
    lastSeenAt: r.last_seen_at.toISOString(),
    ip: r.ip,
    userAgent: r.user_agent,
    current: r.id === current,
  }));
}

/** Cabut satu sesi milik `userId` (berdasarkan hash). Sesi milik akun lain tidak tersentuh. */
export async function revokeOwnSession(userId: string, id: string) {
  const { rowCount } = await db().query("update sessions set revoked_at = now() where id = $1 and user_id = $2 and revoked_at is null", [id, userId]);
  return (rowCount ?? 0) > 0;
}
