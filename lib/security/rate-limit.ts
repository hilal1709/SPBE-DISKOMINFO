import { getDb } from "@/lib/db";

/** Penghitung jendela tetap per kunci. Tanpa DB (dev) dipakai memori proses. */
const memory = new Map<string, { hits: number; resetAt: number }>();

export type Limit = { limit: number; windowSec: number };
export type RateResult = { ok: boolean; retryAfterSec: number };

/**
 * Tambah satu hit untuk `key` dan cek batasnya. Kunci disimpan di tabel rate_limits (migrasi 019) agar berlaku
 * lintas instance serverless. Bila tabel belum ada, gagal-terbuka sambil mencatat galat (login tidak boleh mati total).
 */
export async function hit(key: string, { limit, windowSec }: Limit): Promise<RateResult> {
  const db = getDb();
  if (!db) {
    const now = Date.now();
    const cur = memory.get(key);
    const entry = !cur || cur.resetAt < now ? { hits: 1, resetAt: now + windowSec * 1000 } : { ...cur, hits: cur.hits + 1 };
    memory.set(key, entry);
    return { ok: entry.hits <= limit, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) };
  }
  try {
    const { rows } = await db.query<{ hits: number; retry: number }>(
      `insert into rate_limits (key, hits, reset_at) values ($1, 1, now() + make_interval(secs => $2))
       on conflict (key) do update set
         hits = case when rate_limits.reset_at < now() then 1 else rate_limits.hits + 1 end,
         reset_at = case when rate_limits.reset_at < now() then excluded.reset_at else rate_limits.reset_at end
       returning hits, greatest(0, ceil(extract(epoch from reset_at - now())))::int as retry`,
      [key, windowSec],
    );
    return { ok: rows[0]!.hits <= limit, retryAfterSec: rows[0]!.retry };
  } catch (error) {
    console.error("[rate-limit] Tabel rate_limits tidak dapat dipakai (jalankan migrasi 019):", error instanceof Error ? error.message : error);
    return { ok: true, retryAfterSec: 0 };
  }
}

/** Hapus penghitung (mis. setelah login berhasil). */
export async function clear(key: string) {
  memory.delete(key);
  await getDb()?.query("delete from rate_limits where key = $1", [key]).catch(() => undefined);
}

/** Saran AI memakai kuota Gemini berbayar: 30 permintaan per pengguna per jam. */
export async function assertAiQuota(actorId: string | null) {
  const result = await hit(`ai:${actorId ?? "demo"}`, { limit: 30, windowSec: 60 * 60 });
  if (!result.ok) throw new Error(`Batas saran AI tercapai. Coba lagi dalam ${Math.ceil(result.retryAfterSec / 60)} menit.`);
}

/** IP klien dari header proxy Vercel (x-forwarded-for: klien, proxy1, …). */
export function clientIp(headers: Headers) {
  return headers.get("x-real-ip") ?? headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}
