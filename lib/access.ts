import { auth } from "@/auth";
import type { Actor } from "@/lib/permissions";

/** Sesi aktif, atau superadmin demo bila login belum diwajibkan (AUTH_REQUIRED ≠ true). */
export async function currentActor(): Promise<Actor> {
  const session = await auth();
  if (session?.user) {
    return { id: session.user.id, name: session.user.name ?? "Pengguna", role: session.user.role, opdId: session.user.opdId ?? null, demo: false };
  }
  if (process.env.AUTH_REQUIRED === "true") throw new Error("Sesi berakhir. Silakan masuk kembali.");
  return { id: null, name: "Admin Diskominfo", role: "superadmin", opdId: null, demo: true };
}

export { can, stageOf, stageStatus, type Actor, type ReviewStage } from "@/lib/permissions";
