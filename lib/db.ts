import { Pool, type PoolConfig } from "pg"; let pool: Pool | undefined;
/**
 * TLS dengan verifikasi sertifikat server memakai DATABASE_CA (isi PEM sertifikat root Supabase). Di production
 * tanpa DATABASE_CA koneksi ditolak (gagal-tertutup) agar server palsu di jalur jaringan tidak bisa menyadap sandi
 * database. `sslmode=disable` (database uji lokal/CI) mematikan TLS; di dev tanpa CA identitas server tidak dicek.
 */
function sslConfig(): PoolConfig["ssl"] {
  if (/sslmode=disable/.test(process.env.DATABASE_URL ?? "")) return false;
  if (process.env.DATABASE_CA) return { ca: process.env.DATABASE_CA.replace(/\\n/g, "\n"), rejectUnauthorized: true };
  if (process.env.NODE_ENV === "production") throw new Error("DATABASE_CA wajib diisi di production (sertifikat root Supabase) agar sertifikat database diverifikasi.");
  return { rejectUnauthorized: false };
}
// Koneksi dipakai ulang antar-request; query macet dihentikan agar tidak menahan halaman.
export function getDb() { if (!process.env.DATABASE_URL) return null; pool ??= new Pool({ connectionString:process.env.DATABASE_URL, ssl:sslConfig(), max:Number(process.env.DB_POOL_MAX ?? 10), idleTimeoutMillis:30_000, keepAlive:true, statement_timeout:30_000 }); return pool; }
