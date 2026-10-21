"use server";
import { revalidatePath } from "next/cache";
import { can, currentActor } from "@/lib/access";
import { fail, type ActionResult } from "@/lib/cms/result";
import * as grants from "@/lib/pengguna/grants";
import * as users from "@/lib/pengguna/repo";
import type { Role } from "@/lib/types";

async function userAdmin() {
  const actor = await currentActor();
  if (!can.manageUsers(actor)) throw new Error("Hanya Superadmin yang dapat mengelola akun dan hak akses.");
  return actor;
}

/** Menu dan izin semua halaman CMS ikut berubah. */
const done = () => revalidatePath("/cms", "layout");

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

/** Hanya Superadmin yang boleh memberi atau mengubah akun Superadmin, walau izin "users" diberikan ke peran lain. */
function guardSuperadmin(actor: { role: Role }, ...roles: Role[]) {
  if (actor.role !== "superadmin" && roles.includes("superadmin")) throw new Error("Hanya Superadmin yang dapat mengelola akun Superadmin.");
}

/* ---------- Akun ---------- */

export async function createAccount(input: unknown): Promise<ActionResult<{ name: string; email: string; password: string }>> {
  try {
    const actor = await userAdmin();
    const parsed = await parse(input);
    if (!parsed.ok) return parsed;
    guardSuperadmin(actor, parsed.data.role);
    const { password } = await users.createUser(parsed.data);
    done();
    return { ok: true, data: { name: parsed.data.name, email: parsed.data.email, password } };
  } catch (error) {
    return fail(error);
  }
}

export async function updateAccount(id: string, input: unknown): Promise<ActionResult> {
  try {
    const actor = await userAdmin();
    const parsed = await parse(input);
    if (!parsed.ok) return parsed;
    const target = await users.getUser(id);
    if (!target) throw new Error("Akun tidak ditemukan.");
    guardSuperadmin(actor, target.role, parsed.data.role);
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
    const actor = await userAdmin();
    const target = await users.getUser(id);
    if (!target) throw new Error("Akun tidak ditemukan.");
    guardSuperadmin(actor, target.role);
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
    const actor = await userAdmin();
    const target = await users.getUser(id);
    if (!target) throw new Error("Akun tidak ditemukan.");
    guardSuperadmin(actor, target.role);
    const password = await users.resetPassword(id);
    return { ok: true, data: { password } };
  } catch (error) {
    return fail(error);
  }
}

/* ---------- Hak akses ---------- */

export async function saveRoleAccess(role: Role, perms: string[]): Promise<ActionResult> {
  try {
    const actor = await userAdmin();
    await grants.saveGrants(role, perms, actor.id);
    done();
    return { ok: true, data: undefined };
  } catch (error) {
    return fail(error);
  }
}

export async function resetRoleAccess(role: Role): Promise<ActionResult> {
  try {
    await userAdmin();
    await grants.resetGrants(role);
    done();
    return { ok: true, data: undefined };
  } catch (error) {
    return fail(error);
  }
}

/* ---------- Peran kustom ---------- */

type RoleInput = { label: string; description?: string | null };
function roleInput(input: RoleInput) {
  const label = input.label.trim().replace(/\s+/g, " ");
  if (label.length < 3 || label.length > 60) throw new Error("Nama peran 3–60 karakter.");
  return { label, description: input.description?.trim() || null };
}

export async function createRole(input: RoleInput & { copyFrom?: Role | null }): Promise<ActionResult<{ key: Role }>> {
  try {
    const actor = await userAdmin();
    const key = await grants.createRole({ ...roleInput(input), copyFrom: input.copyFrom ?? null }, actor.id);
    done();
    return { ok: true, data: { key } };
  } catch (error) {
    return fail(error);
  }
}

export async function updateRole(key: Role, input: RoleInput): Promise<ActionResult> {
  try {
    await userAdmin();
    await grants.updateRole(key, roleInput(input));
    done();
    return { ok: true, data: undefined };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteRole(key: Role): Promise<ActionResult> {
  try {
    await userAdmin();
    await grants.deleteRole(key);
    done();
    return { ok: true, data: undefined };
  } catch (error) {
    return fail(error);
  }
}
