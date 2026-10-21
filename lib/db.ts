import { Pool } from "pg"; let pool: Pool | undefined;
// Koneksi dipakai ulang antar-request; query macet dihentikan agar tidak menahan halaman.
export function getDb() { if (!process.env.DATABASE_URL) return null; pool ??= new Pool({ connectionString:process.env.DATABASE_URL, ssl:{ rejectUnauthorized:false }, max:Number(process.env.DB_POOL_MAX ?? 10), idleTimeoutMillis:30_000, keepAlive:true, statement_timeout:30_000 }); return pool; }
