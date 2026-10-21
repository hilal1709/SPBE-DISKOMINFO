import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getDb } from "@/lib/db";
import type { Role } from "@/lib/types";

/** Akun CMS (tabel users). Server saja. */
export type UserAccount = {
  id: string;
  name: string;
  email: string;
  role: Role;
  opdId: string | null;
  opdCode: string | null;
  opdName: string | null;
  active: boolean;
  createdAt: string;
  lastLoginAt: string | null;
};

export type OpdOption = { id: string; code: string; name: string };

/** Peran dicek terhadap daftar peran (bawaan + kustom) dan kewajiban OPD-nya di server action. */
export const userInput = z.object({
  name: z.string().trim().min(3, "Nama minimal 3 karakter.").max(120),
  email: z.email("Email tidak valid.").trim().toLowerCase(),
  role: z.string().min(1, "Pilih peran."),
  opdId: z.uuid().nullable(),
});
export type UserInput = z.infer<typeof userInput>;

function db() {
  const pool = getDb();
  if (!pool) throw new Error("Database belum dikonfigurasi (DATABASE_URL).");
  return pool;
}

const select = `select u.id, u.name, u.email, u.role, u.opd_id, o.code as opd_code, o.name as opd_name,
                       coalesce(u.active, true) as active, u.created_at, u.last_login_at
                from users u left join opd o on o.id = u.opd_id`;

type Row = {
  id: string; name: string; email: string; role: Role; opd_id: string | null; opd_code: string | null; opd_name: string | null;
  active: boolean; created_at: Date; last_login_at: Date | null;
};

const toAccount = (r: Row): UserAccount => ({
  id: r.id,
  name: r.name,
  email: r.email,
  role: r.role,
  opdId: r.opd_id,
  opdCode: r.opd_code,
  opdName: r.opd_name,
  active: r.active,
  createdAt: r.created_at.toISOString(),
  lastLoginAt: r.last_login_at?.toISOString() ?? null,
});

export async function listUsers(): Promise<UserAccount[]> {
  const { rows } = await db().query<Row>(`${select} order by coalesce(u.active, true) desc, u.name`);
  return rows.map(toAccount);
}

export async function getUser(id: string) {
  const { rows } = await db().query<Row>(`${select} where u.id = $1`, [id]);
  return rows[0] ? toAccount(rows[0]) : null;
}

export async function listOpd(): Promise<OpdOption[]> {
  const { rows } = await db().query<OpdOption>("select id, code, name from opd order by name");
  return rows;
}

/** Peran, OPD, dan status terkini (dibaca setiap request agar perubahan akun berlaku seketika). */
export async function sessionUser(id: string) {
  const { rows } = await db().query<{ name: string; role: Role; opd_id: string | null; active: boolean }>(
    "select name, role, opd_id, coalesce(active, true) as active from users where id = $1",
    [id],
  );
  return rows[0] ?? null;
}

/** Sandi sementara 12 karakter tanpa huruf yang mudah tertukar (0/O, 1/l/I). */
export function temporaryPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  return Array.from({ length: 12 }, () => chars[randomInt(chars.length)]).join("");
}

const uniqueEmail = (error: unknown) => {
  if ((error as { code?: string }).code === "23505") throw new Error("Email sudah dipakai akun lain.");
  throw error;
};

export async function createUser(v: UserInput) {
  const password = temporaryPassword();
  const hash = await bcrypt.hash(password, 10);
  const { rows } = await db()
    .query<{ id: string }>(
      "insert into users (name, email, role, opd_id, password_hash, active) values ($1, $2, $3, $4, $5, true) returning id",
      [v.name, v.email, v.role, v.opdId, hash],
    )
    .catch(uniqueEmail);
  return { id: rows[0]!.id, password };
}

export async function updateUser(id: string, v: UserInput) {
  const { rowCount } = await db()
    .query("update users set name = $2, email = $3, role = $4, opd_id = $5, updated_at = now() where id = $1", [id, v.name, v.email, v.role, v.opdId])
    .catch(uniqueEmail);
  if (!rowCount) throw new Error("Akun tidak ditemukan.");
}

export async function setUserActive(id: string, active: boolean) {
  const { rowCount } = await db().query("update users set active = $2, updated_at = now() where id = $1", [id, active]);
  if (!rowCount) throw new Error("Akun tidak ditemukan.");
}

export async function resetPassword(id: string) {
  const password = temporaryPassword();
  const { rowCount } = await db().query("update users set password_hash = $2, updated_at = now() where id = $1", [id, await bcrypt.hash(password, 10)]);
  if (!rowCount) throw new Error("Akun tidak ditemukan.");
  return password;
}

/** Jumlah superadmin aktif selain akun ini (pengaman agar CMS tidak kehilangan superadmin). */
export async function otherActiveSuperadmins(id: string) {
  const { rows } = await db().query<{ n: number }>("select count(*)::int as n from users where role = 'superadmin' and coalesce(active, true) and id <> $1", [id]);
  return rows[0]!.n;
}
