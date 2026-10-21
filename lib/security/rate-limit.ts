import { getDb } from "@/lib/db";

/** Penghitung jendela tetap per kunci. Tanpa DB (dev) atau saat DB galat dipakai memori proses. */
const memory = new Map<string, { hits: number; resetAt: number }>();

export type Limit = { limit: number; windowSec: number };
export type RateResult = { ok: boolean; retryAfterSec: number };

function hitMemory(key: string, { limit, windowSec }: Limit): RateResult {
  const now = Date.now();
  const cur = memory.get(key);
  const entry = !cur || cur.resetAt < now ? { hits: 1, resetAt: now + windowSec * 1000 } : { ...cur, hits: cur.hits + 1 };
  memory.set(key, entry);
  return { ok: entry.hits <= limit, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) };
}

/**
 * Tambah satu hit untuk `key` dan cek batasnya. Kunci disimpan di tabel rate_limits (migrasi 019) agar berlaku
 * lintas instance serverless. Bila tabel tak dapat dipakai, batas tetap berlaku per instance lewat memori (tidak gagal-terbuka).
 */
export async function hit(key: string, limit: Limit): Promise<RateResult> {
  const db = getDb();
  if (!db) return hitMemory(key, limit);
  try {
    const { rows } = await db.query<{ hits: number; retry: number }>(
      `insert into rate_limits (key, hits, reset_at) values ($1, 1, now() + make_interval(secs => $2))
       on conflict (key) do update set
         hits = case when rate_limits.reset_at < now() then 1 else rate_limits.hits + 1 end,
         reset_at = case when rate_limits.reset_at < now() then excluded.reset_at else rate_limits.reset_at end
       returning hits, greatest(0, ceil(extract(epoch from reset_at - now())))::int as retry`,
      [key, limit.windowSec],
    );
    // Bersihkan penghitung kedaluwarsa sesekali agar tabel tidak tumbuh terus (tanpa cron).
    if (Math.random() < 0.01) void db.query("delete from rate_limits where reset_at < now() - interval '1 day'").catch(() => undefined);
    return { ok: rows[0]!.hits <= limit.limit, retryAfterSec: rows[0]!.retry };
  } catch (error) {
    console.error("[rate-limit] Tabel rate_limits tidak dapat dipakai (jalankan migrasi 019); memakai memori:", error instanceof Error ? error.message : error);
    return hitMemory(key, limit);
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

/**
 * IP klien untuk pembatas percobaan. Header proxy bisa dipalsukan klien, jadi hanya dipercaya dari proxy yang dikenal:
 * di Vercel (header diisi ulang oleh edge Vercel), atau di server sendiri bila TRUST_PROXY=true dan reverse proxy
 * (nginx dsb.) menimpa X-Real-IP / menambahkan IP klien sebagai entri terakhir X-Forwarded-For.
 */
export function clientIp(headers: Headers) {
  if (process.env.VERCEL) {
    return headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
  }
  if (process.env.TRUST_PROXY === "true") {
    return headers.get("x-real-ip") || headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() || "unknown";
  }
  return "unknown";
}

/** Isian saran AI dibatasi panjangnya: tiap permintaan Gemini dibayar per token dan isian masuk ke prompt apa adanya. */
export function assertAiInput(input: unknown) {
  if (!input || typeof input !== "object") throw new Error("Isian saran tidak valid.");
  for (const [key, value] of Object.entries(input)) {
    if (value == null) continue;
    if (typeof value !== "string") throw new Error("Isian saran tidak valid.");
    if (value.length > (key === "name" ? 200 : 2000)) throw new Error("Isian terlalu panjang untuk saran AI.");
  }
}
