"use server";
import { currentActor } from "@/lib/access";
import { fail, type ActionResult } from "@/lib/cms/result";
import { findEditableRecords, type ExistingRecord } from "@/lib/cms/existing";
import { getDb } from "@/lib/db";
import { isDomain } from "@/lib/domains";

export async function searchExistingRecords(domain: unknown, query: unknown): Promise<ActionResult<ExistingRecord[]>> {
  try {
    const actor = await currentActor();
    if (!isDomain(domain) || typeof query !== "string" || query.trim().length < 2 || query.length > 120) throw new Error("Masukkan kode atau nama, 2 sampai 120 karakter.");
    const db = getDb();
    if (!db) throw new Error("Pencarian belum tersedia karena database belum terhubung.");
    return { ok: true, data: await findEditableRecords(db, actor, domain, query.trim()) };
  } catch (error) { return fail(error); }
}
