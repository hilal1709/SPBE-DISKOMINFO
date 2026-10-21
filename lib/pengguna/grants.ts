import { getDb } from "@/lib/db";
import { allPermissions, defaultsFor, isPermission, lockedRole, type Permission } from "@/lib/permissions";
import { builtinRoles, isBuiltinRole, roleLabel, type RoleInfo } from "@/lib/roles";
import type { Role } from "@/lib/types";

/** Peran (bawaan + kustom) dan hak aksesnya. Hak akses tersimpan di role_access; peran tanpa baris memakai bawaan. Server saja. */
export type RoleGrant = RoleInfo & { perms: Permission[]; custom: boolean; updatedAt: string | null };

const clean = (list: string[]) => allPermissions.filter((p) => list.includes(p));
const builtinInfo = (key: Role): RoleInfo => ({ key, label: roleLabel[key as keyof typeof roleLabel], description: null, builtin: true });

function db() {
  const pool = getDb();
  if (!pool) throw new Error("Database belum dikonfigurasi (DATABASE_URL).");
  return pool;
}

/** Semua peran: bawaan dulu, lalu kustom urut nama. Tanpa database hanya peran bawaan. */
export async function listRoles(): Promise<RoleInfo[]> {
  const builtin = builtinRoles.map(builtinInfo);
  const pool = getDb();
  if (!pool) return builtin;
  try {
    const { rows } = await pool.query<{ key: string; label: string; description: string | null }>("select key, label, description from custom_roles order by label");
    return [...builtin, ...rows.map((r) => ({ ...r, builtin: false }))];
  } catch {
    return builtin;
  }
}

/** Hak akses efektif dari baris custom_roles/role_access yang sudah dibaca. Null bila peran sudah tidak ada. */
export function roleGrant(role: Role, customLabel: string | null, permissions: string[] | null): { label: string; perms: Permission[] } | null {
  if (role === lockedRole) return { label: roleLabel.superadmin, perms: allPermissions };
  const label = isBuiltinRole(role) ? roleLabel[role] : customLabel;
  if (!label) return null;
  return { label, perms: permissions ? clean(permissions) : defaultsFor(role) };
}

/** Peran beserta hak akses efektifnya, untuk sesi. Null bila peran sudah tidak ada. */
export async function roleAccess(role: Role): Promise<{ label: string; perms: Permission[] } | null> {
  if (role === lockedRole) return { label: roleLabel.superadmin, perms: allPermissions };
  const pool = getDb();
  if (!pool) return isBuiltinRole(role) ? { label: roleLabel[role], perms: defaultsFor(role) } : null;
  try {
    const { rows } = await pool.query<{ label: string | null; permissions: string[] | null }>(
      "select (select label from custom_roles where key = $1) as label, (select permissions from role_access where role = $1) as permissions",
      [role],
    );
    return roleGrant(role, rows[0]?.label ?? null, rows[0]?.permissions ?? null);
  } catch {
    return isBuiltinRole(role) ? { label: roleLabel[role], perms: defaultsFor(role) } : null;
  }
}

export async function listGrants(): Promise<RoleGrant[]> {
  const [roles, { rows }] = await Promise.all([
    listRoles(),
    db().query<{ role: string; permissions: string[]; updated_at: Date }>("select role, permissions, updated_at from role_access"),
  ]);
  const saved = new Map(rows.map((r) => [r.role, r]));
  return roles.map((info) => {
    const row = info.key === lockedRole ? undefined : saved.get(info.key);
    return {
      ...info,
      perms: info.key === lockedRole ? allPermissions : row ? clean(row.permissions) : defaultsFor(info.key),
      custom: !!row && info.builtin,
      updatedAt: row?.updated_at.toISOString() ?? null,
    };
  });
}

export async function roleExists(role: Role) {
  return (await listRoles()).some((r) => r.key === role);
}

export async function saveGrants(role: Role, perms: string[], actorId: string | null) {
  if (role === lockedRole) throw new Error("Hak akses Superadmin tidak dapat diubah.");
  if (!(await roleExists(role))) throw new Error("Peran tidak dikenal.");
  await db().query(
    `insert into role_access (role, permissions, updated_by, updated_at) values ($1, $2, $3, now())
     on conflict (role) do update set permissions = excluded.permissions, updated_by = excluded.updated_by, updated_at = now()`,
    [role, clean(perms.filter(isPermission)), actorId],
  );
}

/** Kembalikan peran bawaan ke hak akses bawaan. */
export async function resetGrants(role: Role) {
  await db().query("delete from role_access where role = $1", [role]);
}

/* ---------- Peran kustom ---------- */

const slug = (label: string) =>
  label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40) || "peran";

const sameLabel = async (label: string, except?: string) => {
  if (builtinRoles.some((r) => roleLabel[r].toLowerCase() === label.toLowerCase())) return true;
  const { rows } = await db().query("select 1 from custom_roles where lower(label) = lower($1) and key is distinct from $2", [label, except ?? null]);
  return rows.length > 0;
};

/** Buat peran kustom; izin awal disalin dari peran lain (opsional). */
export async function createRole(input: { label: string; description: string | null; copyFrom: Role | null }, actorId: string | null) {
  if (await sameLabel(input.label)) throw new Error("Nama peran sudah dipakai.");
  const base = `kustom_${slug(input.label)}`;
  const { rows } = await db().query<{ key: string }>("select key from custom_roles where key = $1 or key like $1 || '\\_%'", [base]);
  const taken = new Set(rows.map((r) => r.key));
  let key = base;
  for (let i = 2; taken.has(key); i++) key = `${base}_${i}`;

  const perms = input.copyFrom ? ((await roleAccess(input.copyFrom))?.perms ?? []) : [];
  const client = await db().connect();
  try {
    await client.query("begin");
    await client.query("insert into custom_roles (key, label, description, created_by) values ($1, $2, $3, $4)", [key, input.label, input.description, actorId]);
    await client.query("insert into role_access (role, permissions, updated_by) values ($1, $2, $3)", [key, perms, actorId]);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
  return key;
}

export async function updateRole(key: Role, input: { label: string; description: string | null }) {
  if (isBuiltinRole(key)) throw new Error("Peran bawaan tidak dapat diubah namanya.");
  if (await sameLabel(input.label, key)) throw new Error("Nama peran sudah dipakai.");
  const { rowCount } = await db().query("update custom_roles set label = $2, description = $3 where key = $1", [key, input.label, input.description]);
  if (!rowCount) throw new Error("Peran tidak ditemukan.");
}

/** Hapus peran kustom yang tidak lagi dipakai akun mana pun. */
export async function deleteRole(key: Role) {
  if (isBuiltinRole(key)) throw new Error("Peran bawaan tidak dapat dihapus.");
  const { rows } = await db().query<{ n: number }>("select count(*)::int as n from users where role = $1", [key]);
  if (rows[0]!.n) throw new Error(`Peran masih dipakai ${rows[0]!.n} akun. Pindahkan akun tersebut ke peran lain terlebih dahulu.`);
  await db().query("delete from role_access where role = $1", [key]);
  await db().query("delete from custom_roles where key = $1", [key]);
}
