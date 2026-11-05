// Buat akun uji per peran untuk lingkungan STAGING (permintaan uji lanjutan tim developer).
// Jalankan: pnpm akun:uji --staging <domain-email> [kode-OPD-operator]
//   mis. pnpm akun:uji --staging staging.spbe.test DISKOMINFO
// Sandi sementara acak (wajib diganti saat masuk) hanya dicetak sekali di terminal; tidak disimpan di mana pun.
// Jangan dijalankan ke database production: skrip menolak berjalan tanpa --staging.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import pg from "pg";

const args = process.argv.slice(2);
if (!args.includes("--staging")) throw new Error("Tambahkan --staging untuk menegaskan ini database staging/uji, bukan production.");
const [domain, opdCode = "DISKOMINFO"] = args.filter((a) => a !== "--staging");
if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) throw new Error("Pakai: pnpm akun:uji --staging <domain-email> [kode-OPD-operator]");

/** Peran yang belum teruji menurut laporan, plus Operator OPD untuk uji lintas peran. */
const roles = [
  ["organisasi", "Uji Tim Verifikasi"],
  ["admin", "Uji Tim Validasi"],
  ["pimpinan", "Uji Pimpinan"],
  ["validator_data", "Uji Verifikator Data"],
  ["validator_aplikasi", "Uji Verifikator Aplikasi"],
  ["validator_infrastruktur", "Uji Verifikator Infrastruktur"],
  ["validator_keamanan", "Uji Verifikator Keamanan"],
  ["operator_opd", `Uji Operator ${opdCode}`],
] as const;

const envFile = join(import.meta.dirname, "../.env.local");
const fromEnvFile = (key: string) => (existsSync(envFile) ? readFileSync(envFile, "utf8").match(new RegExp(`^${key}=(.*)$`, "m"))?.[1]?.trim() : undefined);
const url = process.env.DATABASE_URL ?? fromEnvFile("DATABASE_URL");
if (!url) throw new Error("DATABASE_URL tidak tersedia");
const ca = process.env.DATABASE_CA ?? fromEnvFile("DATABASE_CA");
const ssl = /sslmode=disable/.test(url) ? false : ca ? { ca: ca.replace(/\n/g, "\n"), rejectUnauthorized: true } : { rejectUnauthorized: false };

const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
const newPassword = () => Array.from({ length: 16 }, () => chars[randomInt(chars.length)]).join("");

const client = new pg.Client({ connectionString: url, ssl });
await client.connect();
const created: { email: string; role: string; password: string }[] = [];
try {
  const { rows } = await client.query("select id from opd where code = $1", [opdCode]);
  if (!rows[0]) throw new Error(`OPD ${opdCode} tidak ditemukan.`);
  const opdId = rows[0].id as string;
  for (const [role, name] of roles) {
    const email = `uji.${role.replace(/_/g, "-")}@${domain.toLowerCase()}`;
    const password = newPassword();
    await client.query(
      `insert into users (email, name, role, opd_id, password_hash, active, must_change_password, password_changed_at)
       values ($1, $2, $3, $4, $5, true, true, now())
       on conflict (email) do update set role = excluded.role, opd_id = excluded.opd_id, password_hash = excluded.password_hash,
         active = true, must_change_password = true, password_changed_at = now()`,
      [email, name, role, role === "operator_opd" ? opdId : null, await bcrypt.hash(password, 12)],
    );
    created.push({ email, role, password });
  }
} finally {
  await client.end();
}
console.log("Akun uji siap (sandi sementara, wajib diganti saat masuk):");
console.table(created);
