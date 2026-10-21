import { notFound } from "next/navigation";
import { can, currentActor, type Actor } from "@/lib/access";
import { isUuid } from "@/lib/constants";
import { periodOptions } from "@/lib/probis/periods";
import { opdCodeOf } from "@/lib/probis/repo";

/**
 * Halaman ubah CMS: id harus UUID, isian harus ada, dan milik OPD pengguna (atau `readAll`); selain itu 404 agar
 * keberadaan rekaman OPD lain tidak terungkap.
 */
export async function loadRecord<T extends { opdId?: string | null }>(params: Promise<{ id: string }>, get: (id: string) => Promise<T | null>) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [actor, record] = await Promise.all([currentActor(), get(id)]);
  if (!record || !can.read(actor, record.opdId)) notFound();
  return { actor, record };
}

/** Props form isian yang sama di semua domain: kode OPD terkunci (pengguna OPD) dan pilihan periode. */
export async function formContext(actor: Actor) {
  const locked = can.lockedOpd(actor);
  const [lockedOpd, periods] = await Promise.all([locked ? opdCodeOf(locked) : null, periodOptions()]);
  return { lockedOpd, periods };
}
