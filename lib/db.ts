import { Pool } from "pg"; let pool: Pool | undefined;
/**
 * Sertifikat server diverifikasi bila DATABASE_CA (isi PEM sertifikat root Supabase) diset; tanpa itu koneksi tetap
 * terenkripsi TLS tetapi identitas server tidak dicek.
 */
const ssl = process.env.DATABASE_CA ? { ca: process.env.DATABASE_CA.replace(/\\n/g, "\n"), rejectUnauthorized: true } : { rejectUnauthorized: false };
// Koneksi dipakai ulang antar-request; query macet dihentikan agar tidak menahan halaman.
export function getDb() { if (!process.env.DATABASE_URL) return null; pool ??= new Pool({ connectionString:process.env.DATABASE_URL, ssl, max:Number(process.env.DB_POOL_MAX ?? 10), idleTimeoutMillis:30_000, keepAlive:true, statement_timeout:30_000 }); return pool; }
