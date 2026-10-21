import { cache } from "react";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { roleAccess, roleGrant } from "@/lib/pengguna/grants";
import { sessionAccess } from "@/lib/pengguna/repo";
import type { Actor } from "@/lib/permissions";
import type { Role } from "@/lib/types";

type SessionLike = { id: string; name?: string | null; role: Role; opdId?: string | null };

/**
 * Actor untuk pengguna sesi: peran, OPD, dan status dibaca ulang dari database agar perubahan akun berlaku seketika
 * (JWT hanya penanda identitas). Null bila akun sudah dinonaktifkan atau dihapus.
 */
export async function actorFor(user: SessionLike): Promise<Actor | null> {
  let { name, role, opdId } = { name: user.name ?? "Pengguna", role: user.role, opdId: user.opdId ?? null };
  if (getDb() && user.id !== "demo-admin") {
    // Akun + hak akses perannya dalam satu query (setiap halaman CMS & server action melewati ini).
    const fresh = await sessionAccess(user.id).catch(() => undefined);
    if (fresh === null || fresh?.active === false) return null;
    if (fresh) {
      ({ name, role, opd_id: opdId } = fresh);
      const access = roleGrant(role, fresh.custom_label, fresh.permissions);
      return { id: user.id, name, role, roleName: access?.label ?? role, opdId, demo: false, perms: access?.perms ?? [] };
    }
  }
  const access = await roleAccess(role);
  return { id: user.id, name, role, roleName: access?.label ?? role, opdId, demo: false, perms: access?.perms ?? [] };
}

/** Sesi aktif, atau superadmin demo bila login belum diwajibkan (AUTH_REQUIRED ≠ true). Sekali per request. */
export const currentActor = cache(async (): Promise<Actor> => {
  const session = await auth();
  if (session?.user) {
    const actor = await actorFor(session.user);
    if (actor) return actor;
    throw new Error("Akun Anda tidak aktif. Hubungi admin Diskominfo.");
  }
  if (process.env.AUTH_REQUIRED === "true") throw new Error("Sesi berakhir. Silakan masuk kembali.");
  const access = (await roleAccess("superadmin"))!;
  return { id: null, name: "Admin Diskominfo", role: "superadmin", roleName: "Superadmin (demo)", opdId: null, demo: true, perms: access.perms };
});

export { can, reviewTeam, stageOf, stageStatus, type Actor, type Permission, type ReviewDomain, type ReviewStage } from "@/lib/permissions";
