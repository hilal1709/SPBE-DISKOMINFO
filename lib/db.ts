import { Pool } from "pg"; let pool: Pool | undefined;
export function getDb() { if (!process.env.DATABASE_URL) return null; pool ??= new Pool({ connectionString:process.env.DATABASE_URL, ssl:{ rejectUnauthorized:false }}); return pool; }
