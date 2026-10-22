import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/auth";
import { authRequired } from "@/lib/auth-mode";
import { getDb } from "@/lib/db";
import { roleAccess, roleGrant } from "@/lib/pengguna/grants";
import { sessionAccess } from "@/lib/pengguna/repo";
import { NIL_UUID } from "@/lib/constants";
import { can, type Actor } from "@/lib/permissions";
import type { Role } from "@/lib/types";

type SessionLike = { id: string; name?: string | null; role: Role; opdId?: string | null; sid?: string };

/**
 * Actor untuk pengguna sesi: peran, OPD, dan status dibaca ulang dari database agar perubahan akun berlaku seketika
 * (JWT hanya penanda identitas + id sesi). Null bila akun sudah dinonaktifkan/dihapus, atau sesinya tidak sah lagi di
 * tabel sessions (logout, dicabut, lewat 8 jam, tidak aktif 30 menit, terbit sebelum sandi diganti). Token lama tanpa
 * id sesi juga ditolak.
 */
export async function actorFor(user: SessionLike): Promise<Actor | null> {
  let { name, role, opdId } = { name: user.name ?? "Pengguna", role: user.role, opdId: user.opdId ?? null };
  if (user.id === "demo-admin" && process.env.NODE_ENV === "production") return null;
  if (getDb() && user.id !== "demo-admin") {
    if (!user.sid) return null;
    // Akun + hak akses perannya + keabsahan sesi dalam satu query (setiap halaman CMS & server action melewati ini). Galat
    // DB dilempar (gagal-tertutup): peran dari JWT tidak dipakai karena bisa sudah dicabut.
    const fresh = await sessionAccess(user.id, user.sid);
    if (!fresh || !fresh.active || !fresh.session_ok) return null;
    ({ name, role, opd_id: opdId } = fresh);
    const access = roleGrant(role, fresh.custom_label, fresh.permissions);
    return {
      id: user.id, name, role, roleName: access?.label ?? role, opdId, demo: false, perms: access?.perms ?? [],
      mustChangePassword: fresh.must_change_password,
    };
  }
  const access = await roleAccess(role);
  return { id: user.id, name, role, roleName: access?.label ?? role, opdId, demo: false, perms: access?.perms ?? [] };
}

/** Pengguna sesi tanpa syarat sandi sudah diganti: dipakai halaman CMS (untuk mengalihkan) dan halaman ganti sandi. Sekali per request. */
export const sessionActor = cache(async (): Promise<Actor | null> => {
  const session = await auth();
  return session?.user ? actorFor(session.user) : null;
});

/** Sesi aktif, atau superadmin demo bila login belum diwajibkan (hanya di dev). Sekali per request. */
export const currentActor = cache(async (): Promise<Actor> => {
  const session = await auth();
  if (session?.user) {
    const actor = await sessionActor();
    // Sesi dicabut (sandi diganti/di-reset, akun nonaktif) → masuk ulang. Sandi sementara → semua halaman & server action
    // CMS terkunci sampai sandi diganti. redirect() juga berlaku dari server action (fail() meneruskannya).
    if (!actor) redirect("/login?pesan=sesi");
    if (actor.mustChangePassword) redirect("/akun/sandi");
    return actor;
  }
  if (authRequired) throw new Error("Sesi berakhir. Silakan masuk kembali.");
  const access = (await roleAccess("superadmin"))!;
  return { id: null, name: "Admin Diskominfo", role: "superadmin", roleName: "Superadmin (demo)", opdId: null, demo: true, perms: access.perms };
});

export { can, reviewTeam, stageOf, stageStatus, reviewTarget, type Actor, type Permission, type ReviewDomain, type ReviewStage } from "@/lib/permissions";

/** Cakupan OPD untuk query daftar: `null` = semua OPD, selain itu OPD pengguna (tanpa OPD → tidak ada baris). */
export const opdScope = (actor: Actor): string | null => (can.readAll(actor) ? null : (actor.opdId ?? NIL_UUID));
