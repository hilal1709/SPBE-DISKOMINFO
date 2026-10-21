"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { can, currentActor } from "@/lib/access";
import { fail, type ActionResult } from "@/lib/cms/result";
import * as grants from "@/lib/pengguna/grants";
import * as users from "@/lib/pengguna/repo";
import { broadcastChange } from "@/lib/realtime/server";
import { logAuthEvent } from "@/lib/security/audit";
import { assertAdminQuota } from "@/lib/security/rate-limit";
import { arg, idSchema, roleKey } from "@/lib/security/schemas";
import type { Role } from "@/lib/types";

async function userAdmin() {
  const actor = await currentActor();
  if (!can.manageUsers(actor)) throw new Error("Hanya Superadmin yang dapat mengelola akun dan hak akses.");
  await assertAdminQuota(actor.id);
  return actor;
}

/** Menu dan izin semua halaman CMS ikut berubah, juga di perangkat lain yang sedang membuka CMS. */
const done = () => {
  revalidatePath("/cms", "layout");
  broadcastChange("access");
};

type Invalid = { ok: false; error: string; fields: Record<string, string> };
const invalid = (fields: Record<string, string>): Invalid => ({ ok: false, error: "Periksa kembali isian akun.", fields });

/** Form akun tidak valid → galat per kolom. Peran harus ada; peran tanpa akses semua OPD wajib memilih OPD. */
async function parse(input: unknown): Promise<{ ok: true; data: users.UserInput } | Invalid> {
  const parsed = users.userInput.safeParse(input);
  if (!parsed.success) return invalid(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
  const access = await grants.roleAccess(parsed.data.role);
  if (!access) return invalid({ role: "Peran tidak dikenal." });
  if (!access.perms.includes("readAll") && !parsed.data.opdId) return invalid({ opdId: `${access.label} hanya melihat data OPD-nya, pilih Perangkat Daerah.` });
  return { ok: true, data: parsed.data };
}

/** CMS harus selalu punya minimal satu Superadmin aktif. */
async function keepSuperadmin(target: users.UserAccount) {
  if (target.role === "superadmin" && target.active && (await users.otherActiveSuperadmins(target.id)) === 0)
    throw new Error("Ini Superadmin aktif terakhir. Tambahkan Superadmin lain terlebih dahulu.");
}

/**
 * Hanya Superadmin yang boleh memberi atau mengubah akun Superadmin, walau izin "users" diberikan ke peran lain.
 * Pengelola akun lain tidak boleh menyentuh akun berperan lebih kuat dari dirinya (mis. reset sandi lalu masuk sebagai akun itu).
 */
async function guardSuperadmin(actor: { role: Role; perms: readonly string[] }, ...roles: Role[]) {
  if (actor.role === "superadmin") return;
  if (roles.includes("superadmin")) throw new Error("Hanya Superadmin yang dapat mengelola akun Superadmin.");
  for (const role of roles) {
    const access = await grants.roleAccess(role);
    if (access?.perms.some((p) => !actor.perms.includes(p))) throw new Error(`Peran ${access.label} memiliki hak akses melebihi peran Anda.`);
  }
}

/** Hak akses & peran kustom hanya diatur Superadmin agar pemegang izin "users" tidak bisa menaikkan izinnya sendiri. */
async function roleAdmin() {
  const actor = await userAdmin();
  if (actor.role !== "superadmin") throw new Error("Hanya Superadmin yang dapat mengatur peran dan hak akses.");
  return actor;
}

/* ---------- Akun ---------- */

export async function createAccount(input: unknown): Promise<ActionResult<{ name: string; email: string; password: string }>> {
  try {
    const actor = await userAdmin();
    const parsed = await parse(input);
    if (!parsed.ok) return parsed;
    await guardSuperadmin(actor, parsed.data.role);
    const { password } = await users.createUser(parsed.data);
    done();
    return { ok: true, data: { name: parsed.data.name, email: parsed.data.email, password } };
  } catch (error) {
    return fail(error);
  }
}

export async function updateAccount(id: string, input: unknown): Promise<ActionResult> {
  try {
    arg(idSchema, id);
    const actor = await userAdmin();
    const parsed = await parse(input);
    if (!parsed.ok) return parsed;
    const target = await users.getUser(id);
    if (!target) throw new Error("Akun tidak ditemukan.");
    await guardSuperadmin(actor, target.role, parsed.data.role);
    if (parsed.data.role !== target.role) {
      if (target.id === actor.id) throw new Error("Peran akun sendiri tidak dapat diubah.");
      await keepSuperadmin(target);
    }
    await users.updateUser(id, parsed.data);
    done();
    return { ok: true, data: undefined };
  } catch (error) {
    return fail(error);
  }
}

export async function setAccountActive(id: string, active: boolean): Promise<ActionResult> {
  try {
    arg(idSchema, id);
    arg(z.boolean("Data tidak valid."), active);
    const actor = await userAdmin();
    const target = await users.getUser(id);
    if (!target) throw new Error("Akun tidak ditemukan.");
    await guardSuperadmin(actor, target.role);
    if (!active) {
      if (target.id === actor.id) throw new Error("Akun sendiri tidak dapat dinonaktifkan.");
      await keepSuperadmin(target);
    }
    await users.setUserActive(id, active);
    done();
    return { ok: true, data: undefined };
  } catch (error) {
    return fail(error);
  }
}

export async function resetAccountPassword(id: string): Promise<ActionResult<{ password: string }>> {
  try {
    arg(idSchema, id);
    const actor = await userAdmin();
    const target = await users.getUser(id);
    if (!target) throw new Error("Akun tidak ditemukan.");
    await guardSuperadmin(actor, target.role);
    const password = await users.resetPassword(id);
    await logAuthEvent("password_reset", { userId: id, email: target.email });
    return { ok: true, data: { password } };
  } catch (error) {
    return fail(error);
  }
}

/* ---------- Hak akses ---------- */

export async function saveRoleAccess(role: Role, perms: string[]): Promise<ActionResult> {
  try {
    arg(roleKey, role);
    arg(permList, perms);
    const actor = await roleAdmin();
    await grants.saveGrants(role, perms, actor.id);
    done();
    return { ok: true, data: undefined };
  } catch (error) {
    return fail(error);
  }
}

export async function resetRoleAccess(role: Role): Promise<ActionResult> {
  try {
    arg(roleKey, role);
    await roleAdmin();
    await grants.resetGrants(role);
    done();
    return { ok: true, data: undefined };
  } catch (error) {
    return fail(error);
  }
}

/* ---------- Peran kustom ---------- */

type RoleInput = { label: string; description?: string | null };
const roleSchema = z.object({
  label: z.string("Nama peran 3–60 karakter.").trim().transform((v) => v.replace(/\s+/g, " ")).pipe(z.string().min(3, "Nama peran 3–60 karakter.").max(60, "Nama peran 3–60 karakter.")),
  description: z.string("Data tidak valid.").trim().max(200, "Keterangan maksimal 200 karakter.").nullish().transform((v) => v || null),
  copyFrom: roleKey.nullish(),
});
const permList = z.array(z.string("Data tidak valid.").max(64, "Data tidak valid."), "Data tidak valid.").max(100, "Data tidak valid.");
const roleInput = (input: RoleInput) => {
  const { label, description } = arg(roleSchema, input);
  return { label, description };
};

export async function createRole(input: RoleInput & { copyFrom?: Role | null }): Promise<ActionResult<{ key: Role }>> {
  try {
    const actor = await roleAdmin();
    const key = await grants.createRole({ ...roleInput(input), copyFrom: arg(roleSchema.shape.copyFrom, input.copyFrom) ?? null }, actor.id);
    done();
    return { ok: true, data: { key } };
  } catch (error) {
    return fail(error);
  }
}

export async function updateRole(key: Role, input: RoleInput): Promise<ActionResult> {
  try {
    arg(roleKey, key);
    await roleAdmin();
    await grants.updateRole(key, roleInput(input));
    done();
    return { ok: true, data: undefined };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteRole(key: Role): Promise<ActionResult> {
  try {
    arg(roleKey, key);
    await roleAdmin();
    await grants.deleteRole(key);
    done();
    return { ok: true, data: undefined };
  } catch (error) {
    return fail(error);
  }
}
