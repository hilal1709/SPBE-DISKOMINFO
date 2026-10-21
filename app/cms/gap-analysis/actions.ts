"use server";
import { arg, editOptions, idSchema, isValid, noteSchema, periodName } from "@/lib/security/schemas";
import { z } from "zod";
import { can, currentActor } from "@/lib/access";
import { fail, refresh, type ActionResult } from "@/lib/cms/result";
import * as repo from "@/lib/gap/cms-repo";
import { gapInput, type GapInput } from "@/lib/gap/schema";
import { rencanaInput, type RencanaInput } from "@/lib/peta-rencana/schema";

/** Gap Analysis dikelola Diskominfo (Admin Operator) dan tim Diskominfo, sama dengan Peta Rencana. */
async function manager() {
  const actor = await currentActor();
  if (!can.manageRencana(actor)) throw new Error("Gap Analysis dikelola oleh Admin Operator Diskominfo.");
  return actor;
}

const gapStatusArgs = z.object({ id: idSchema, status: z.enum(["terbuka", "diabaikan"], "Data tidak valid."), note: noteSchema.optional() });

const fieldErrors = (issues: { path: PropertyKey[]; message: string }[]) => Object.fromEntries(issues.map((issue) => [String(issue.path[0]), issue.message]));

/** Pindai ulang kesenjangan satu periode dari data tervalidasi semua domain. */
export async function scanGapAction(period: string): Promise<ActionResult<{ created: number; updated: number; closed: number; total: number }>> {
  try {
    arg(periodName, period);
    const actor = await manager();
    const result = await repo.scanGaps(period, actor);
    refresh();
    return { ok: true, data: result };
  } catch (error) {
    return fail(error);
  }
}

export async function saveGapAction(input: GapInput, options: { id?: string }): Promise<ActionResult<{ id: string }>> {
  if (!isValid(editOptions, options)) return { ok: false, error: "Data tidak valid." };
  const parsed = gapInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Periksa kembali isian yang ditandai.", fields: fieldErrors(parsed.error.issues) };
  try {
    const actor = await manager();
    const id = await repo.saveGap(parsed.data, actor, options.id);
    refresh();
    return { ok: true, data: { id } };
  } catch (error) {
    return fail(error);
  }
}

/** Abaikan (wajib catatan) atau buka kembali temuan. */
export async function setGapStatusAction(id: string, status: "terbuka" | "diabaikan", note?: string): Promise<ActionResult> {
  try {
    ({ id, status, note } = arg(gapStatusArgs, { id, status, note }));
    const actor = await manager();
    const text = note?.trim() || null;
    if (status === "diabaikan" && !text) throw new Error("Tuliskan alasan temuan ini diabaikan.");
    await repo.setGapStatus(id, status, text, actor);
    refresh();
    return { ok: true, data: undefined };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteGapAction(id: string): Promise<ActionResult> {
  try {
    arg(idSchema, id);
    await manager();
    await repo.deleteGap(id);
    refresh();
    return { ok: true, data: undefined };
  } catch (error) {
    return fail(error);
  }
}

/** Jadikan temuan usulan kegiatan Peta Rencana (asal "Hasil gap analysis"). */
export async function proposeGapAction(id: string, input: RencanaInput): Promise<ActionResult<{ roadmapId: string }>> {
  if (!isValid(idSchema, id)) return { ok: false, error: "Data tidak valid." };
  const parsed = rencanaInput.safeParse({ ...input, source: "gap" });
  if (!parsed.success) return { ok: false, error: "Periksa kembali isian kegiatan.", fields: fieldErrors(parsed.error.issues) };
  try {
    const actor = await manager();
    const roadmapId = await repo.proposeToRoadmap(id, parsed.data, actor);
    refresh();
    return { ok: true, data: { roadmapId } };
  } catch (error) {
    return fail(error);
  }
}
