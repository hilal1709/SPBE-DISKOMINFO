// Buat (atau pulihkan) akun superadmin dengan sandi sementara acak yang wajib diganti saat pertama masuk.
// Jalankan: pnpm admin:buat <email> "<nama>"   (DATABASE_URL dari environment, atau .env.local)
// Sandi sementara hanya dicetak sekali di terminal; tidak disimpan di mana pun.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import pg from "pg";

const [email, name = "Superadmin Diskominfo"] = process.argv.slice(2);
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Pakai: pnpm admin:buat <email> "<nama>"');

const envFile = join(import.meta.dirname, "../.env.local");
const url = process.env.DATABASE_URL
  ?? (existsSync(envFile) ? readFileSync(envFile, "utf8").match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim() : undefined);
if (!url) throw new Error("DATABASE_URL tidak tersedia");

const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
const password = Array.from({ length: 16 }, () => chars[randomInt(chars.length)]).join("");

const ca = process.env.DATABASE_CA
  ?? (existsSync(envFile) ? readFileSync(envFile, "utf8").match(/^DATABASE_CA=(.+)$/m)?.[1]?.trim() : undefined);
const ssl = /sslmode=disable/.test(url) ? false : ca ? { ca: ca.replace(/\\n/g, "\n"), rejectUnauthorized: true } : { rejectUnauthorized: false };
const client = new pg.Client({ connectionString: url, ssl });
await client.connect();
try {
  await client.query(
    `insert into users (email, name, role, password_hash, active, must_change_password, password_changed_at)
     values (lower($1), $2, 'superadmin', $3, true, true, now())
     on conflict (email) do update set role = 'superadmin', password_hash = excluded.password_hash, active = true,
       must_change_password = true, password_changed_at = now()`,
    [email, name, await bcrypt.hash(password, 12)],
  );
} finally {
  await client.end();
}
console.log(`Superadmin ${email.toLowerCase()} siap. Sandi sementara (wajib diganti saat masuk): ${password}`);
