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

/** Akun sesi beserta label peran kustom, hak akses tersimpan perannya, dan status sandinya (satu query). */
export async function sessionAccess(id: string) {
  const { rows } = await db().query<{
    name: string; role: Role; opd_id: string | null; active: boolean; custom_label: string | null; permissions: string[] | null;
    must_change_password: boolean; password_changed_at: Date | null;
  }>(
    `select u.name, u.role, u.opd_id, coalesce(u.active, true) as active, cr.label as custom_label, ra.permissions,
            u.must_change_password, u.password_changed_at
     from users u left join custom_roles cr on cr.key = u.role left join role_access ra on ra.role = u.role
     where u.id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

/** Biaya bcrypt untuk hash baru; hash lama (10) dinaikkan saat pengguna berhasil masuk. */
export const BCRYPT_COST = 12;
export const hashPassword = (password: string) => bcrypt.hash(password, BCRYPT_COST);

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
  const hash = await hashPassword(password);
  // Sandi sementara diketahui admin: pengguna wajib menggantinya saat pertama masuk.
  const { rows } = await db()
    .query<{ id: string }>(
      "insert into users (name, email, role, opd_id, password_hash, active, must_change_password, password_changed_at) values ($1, $2, $3, $4, $5, true, true, now()) returning id",
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

/** Reset oleh admin: sesi akun itu di semua perangkat dicabut dan sandi sementara wajib diganti saat masuk. */
export async function resetPassword(id: string) {
  const password = temporaryPassword();
  const { rowCount } = await db().query(
    "update users set password_hash = $2, must_change_password = true, password_changed_at = now(), updated_at = now() where id = $1",
    [id, await hashPassword(password)],
  );
  if (!rowCount) throw new Error("Akun tidak ditemukan.");
  return password;
}

/** Data untuk ganti sandi sendiri. */
export async function passwordRecord(id: string) {
  const { rows } = await db().query<{ name: string; email: string; password_hash: string; must_change_password: boolean }>(
    "select name, email, password_hash, must_change_password from users where id = $1 and coalesce(active, true)",
    [id],
  );
  return rows[0] ?? null;
}

/** Simpan sandi baru pilihan pengguna; semua sesi yang terbit sebelum saat ini tidak berlaku lagi. */
export async function setOwnPassword(id: string, password: string) {
  await db().query(
    "update users set password_hash = $2, must_change_password = false, password_changed_at = now(), updated_at = now() where id = $1",
    [id, await hashPassword(password)],
  );
}

/** Jumlah superadmin aktif selain akun ini (pengaman agar CMS tidak kehilangan superadmin). */
export async function otherActiveSuperadmins(id: string) {
  const { rows } = await db().query<{ n: number }>("select count(*)::int as n from users where role = 'superadmin' and coalesce(active, true) and id <> $1", [id]);
  return rows[0]!.n;
}
