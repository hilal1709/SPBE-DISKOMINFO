"use server";
import { currentActor } from "@/lib/access";
import { isVerifier } from "@/lib/cms/workflow";
import { arg, idSchema } from "@/lib/security/schemas";
import type { ReviewDomain } from "@/lib/permissions";

const domains = new Set<ReviewDomain>(["probis", "layanan", "data", "aplikasi", "infrastruktur", "keamanan"]);

/** Apakah akun yang sedang login adalah verifikator record ini? Dipakai UI untuk menonaktifkan tombol Validasi (B4). */
export async function isOwnVerification(domain: ReviewDomain, id: string): Promise<boolean> {
  if (!domains.has(domain)) return false;
  try {
    arg(idSchema, id);
    const actor = await currentActor();
    return await isVerifier(domain, id, actor);
  } catch {
    return false;
  }
}
