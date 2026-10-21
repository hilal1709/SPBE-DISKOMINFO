"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { auth, signOut } from "@/auth";
import { passwordRecord, setOwnPassword } from "@/lib/pengguna/repo";
import { logAuthEvent } from "@/lib/security/audit";
import { passwordProblem } from "@/lib/security/password";
import { clear, clientIp, hit } from "@/lib/security/rate-limit";
import { revokeOwnSession, revokeUserSessions } from "@/lib/security/session";
import { sessionActor } from "@/lib/access";

export type ChangePasswordState = { error?: string; fields?: Partial<Record<"current" | "next" | "confirm", string>> } | undefined;

/** Menebak sandi lama lewat form ini dibatasi seperti login: 5 kali per akun tiap 15 menit. */
const PER_USER = { limit: 5, windowSec: 15 * 60 };

const field = (formData: FormData, name: string) => {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
};

/** Ganti sandi sendiri. Berhasil → semua sesi (termasuk yang ini) berakhir dan pengguna masuk lagi dengan sandi baru. */
export async function changePassword(_prev: ChangePasswordState, formData: FormData): Promise<ChangePasswordState> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id || id === "demo-admin") return { error: "Masuk dengan akun CMS untuk mengganti sandi." };
  if (!(formData instanceof FormData)) return { error: "Isian tidak valid." };

  const current = field(formData, "current");
  const next = field(formData, "next");
  const confirm = field(formData, "confirm");
  if (!current || current.length > 200) return { fields: { current: "Isi sandi saat ini." } };

  const ip = clientIp(await headers());
  const key = `pwd:${id}`;

  try {
    const account = await passwordRecord(id);
    if (!account) return { error: "Akun tidak aktif. Hubungi admin Diskominfo." };
    // Kesalahan isian sandi baru tidak menghabiskan kuota; hanya pemeriksaan sandi lama yang dihitung.
    const problem = passwordProblem(next, { email: account.email, name: account.name });
    if (problem) return { fields: { next: problem } };
    if (next !== confirm) return { fields: { confirm: "Konfirmasi tidak sama dengan sandi baru." } };

    const limited = await hit(key, PER_USER);
    if (!limited.ok) return { error: `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(limited.retryAfterSec / 60)} menit.` };
    if (!(await bcrypt.compare(current, account.password_hash))) {
      await logAuthEvent("password_change_failed", { userId: id, email: account.email, ip });
      return { fields: { current: "Sandi saat ini salah." } };
    }
    if (await bcrypt.compare(next, account.password_hash)) return { fields: { next: "Sandi baru harus berbeda dari sandi saat ini." } };

    await setOwnPassword(id, next);
    await clear(key);
    await logAuthEvent("password_changed", { userId: id, email: account.email, ip });
  } catch (error) {
    console.error("[akun] Gagal mengganti sandi:", error);
    return { error: "Terjadi kesalahan sistem. Coba lagi atau hubungi admin Diskominfo." };
  }

  // Di luar try: signOut melempar redirect.
  await signOut({ redirectTo: "/login?pesan=sandi" });
}

export type SessionActionResult = { ok: true } | { ok: false; error: string };

/** Hash id sesi (sha256 hex) seperti yang ditampilkan di /akun/sesi. */
const sessionIdPattern = /^[a-f0-9]{64}$/;

/** Pengguna sesi yang masih sah (dicek ulang ke tabel sessions), beserta id sesinya. */
async function ownSession() {
  const session = await auth();
  const sid = session?.user?.sid;
  if (!session?.user?.id || !sid || !(await sessionActor())) return null;
  return { userId: session.user.id, sid };
}

/** Keluarkan satu perangkat. Hanya sesi milik akun sendiri yang bisa dicabut. */
export async function revokeSessionAction(id: unknown): Promise<SessionActionResult> {
  if (typeof id !== "string" || !sessionIdPattern.test(id)) return { ok: false, error: "Sesi tidak valid." };
  const own = await ownSession();
  if (!own) return { ok: false, error: "Sesi berakhir. Silakan masuk kembali." };
  try {
    if (!(await revokeOwnSession(own.userId, id))) return { ok: false, error: "Sesi tidak ditemukan atau sudah berakhir." };
    await logAuthEvent("session_revoked", { userId: own.userId, ip: clientIp(await headers()) });
    return { ok: true };
  } catch (error) {
    console.error("[akun] Gagal mencabut sesi:", error);
    return { ok: false, error: "Terjadi kesalahan sistem." };
  }
}

/** Keluarkan semua perangkat lain; sesi yang sedang dipakai tetap aktif. */
export async function revokeOtherSessionsAction(): Promise<SessionActionResult> {
  const own = await ownSession();
  if (!own) return { ok: false, error: "Sesi berakhir. Silakan masuk kembali." };
  try {
    await revokeUserSessions(own.userId, own.sid);
    await logAuthEvent("sessions_revoked_others", { userId: own.userId, ip: clientIp(await headers()) });
    return { ok: true };
  } catch (error) {
    console.error("[akun] Gagal mencabut sesi lain:", error);
    return { ok: false, error: "Terjadi kesalahan sistem." };
  }
}
