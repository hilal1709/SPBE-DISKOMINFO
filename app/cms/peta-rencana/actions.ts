"use server";
import { assertImportQuota } from "@/lib/security/rate-limit";
import { assertUploadFile } from "@/lib/security/upload";
import { arg, editOptions, idSchema, importRows, isValid, updateOption } from "@/lib/security/schemas";
import { z } from "zod";
import { can, currentActor } from "@/lib/access";
import { fail, refresh, type ActionResult } from "@/lib/cms/result";
import * as repo from "@/lib/peta-rencana/cms-repo";
import { readUpload, validateRows, type RencanaImportResult, type RencanaImportRow } from "@/lib/peta-rencana/import";
import { statusKeys, type RencanaStatus } from "@/lib/peta-rencana/muatan";
import { indicatorInput, rencanaInput, type RencanaInput } from "@/lib/peta-rencana/schema";
import * as periods from "@/lib/probis/periods";

/** Hanya Diskominfo (Admin Operator) dan tim Diskominfo yang mengelola Peta Rencana. */
async function manager() {
  const actor = await currentActor();
  if (!can.manageRencana(actor)) throw new Error("Peta Rencana dikelola oleh Admin Operator Diskominfo.");
  return actor;
}

const rencanaStatus = z.enum(statusKeys, "Data tidak valid.");

const fieldErrors = (issues: { path: PropertyKey[]; message: string }[]) => Object.fromEntries(issues.map((issue) => [String(issue.path[0]), issue.message]));

export async function saveRencana(input: RencanaInput, options: { id?: string }): Promise<ActionResult<{ id: string }>> {
  if (!isValid(editOptions, options)) return { ok: false, error: "Data tidak valid." };
  const parsed = rencanaInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Periksa kembali isian yang ditandai.", fields: fieldErrors(parsed.error.issues) };
  try {
    const actor = await manager();
    const id = options.id ? await repo.updateRencana(options.id, parsed.data, actor) : await repo.createRencana(parsed.data, actor);
    refresh();
    return { ok: true, data: { id } };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteRencana(id: string): Promise<ActionResult> {
  try {
    arg(idSchema, id);
    await manager();
    await repo.deleteRencana(id);
    refresh();
    return { ok: true, data: undefined };
  } catch (error) {
    return fail(error);
  }
}

/** Alihkan kegiatan ke tahun berikutnya (kegiatan asal menjadi "Ditunda"). */
export async function deferRencana(id: string): Promise<ActionResult<{ newId: string; previous: RencanaStatus; year: number; period: string }>> {
  try {
    arg(idSchema, id);
    const actor = await manager();
    const data = await repo.deferRencana(id, actor);
    refresh();
    return { ok: true, data };
  } catch (error) {
    return fail(error);
  }
}

export async function undoDeferRencana(id: string, newId: string, previous: RencanaStatus): Promise<ActionResult> {
  try {
    arg(idSchema, id);
    arg(idSchema, newId);
    arg(rencanaStatus, previous);
    await manager();
    await repo.undoDefer(id, newId, previous);
    refresh();
    return { ok: true, data: undefined };
  } catch (error) {
    return fail(error);
  }
}

async function importContext(codes: string[]) {
  const actor = await manager();
  const [existing, options] = await Promise.all([repo.existingCodes(codes), periods.periodOptions()]);
  return { actor, ctx: { existing, periods: options } };
}

/** Langkah 1 impor: baca berkas, validasi baris, kembalikan pratinjau. */
export async function previewRencanaImport(form: FormData): Promise<ActionResult<RencanaImportResult>> {
  try {
    // Izin dicek sebelum berkas dibaca: mengurai .xlsx/.zip itu berat dan tidak boleh dipicu tanpa hak impor.
    await assertImportQuota((await manager()).id);
    const file = form.get("file");
    assertUploadFile(file, "Pilih berkas .xlsx.");
    const upload = readUpload(file.name, new Uint8Array(await file.arrayBuffer()));
    const { ctx } = await importContext(upload.rows.map((r) => r.code).filter((c): c is string => !!c));
    return { ok: true, data: { file: upload.file, unsupported: upload.unsupported, rows: validateRows(upload.rows, ctx) } };
  } catch (error) {
    return fail(error);
  }
}

/** Langkah 2 impor: simpan baris tanpa galat. Validasi diulang di server. */
export async function commitRencanaImport(rows: RencanaImportRow[], options: { update: boolean }): Promise<ActionResult<{ created: number; updated: number; skipped: number }>> {
  try {
    arg(importRows, rows);
    arg(updateOption, options);
    await assertImportQuota((await manager()).id);
    const { actor, ctx } = await importContext(rows.map((r) => r.code).filter((c): c is string => !!c));
    const valid = validateRows(rows, ctx).filter((r) => !r.issues.some((i) => i.level === "error"));
    const values = valid.map((r) => ({
      ...rencanaInput.parse({
        opd: r.opd ?? "", period: r.period, year: r.year ?? 0, sasaran: r.sasaran, inisiatif: r.inisiatif ?? undefined, muatan: r.muatan ?? undefined,
        program: r.program ?? undefined, name: r.name, target: r.target ?? undefined, jumlah: r.jumlah, satuan: r.satuan, status: r.status,
        realisasi: r.realisasi ?? undefined, evaluasi: r.evaluasi ?? undefined, source: r.source, sourceRef: r.sourceRef ?? undefined,
      }),
      code: r.code,
    }));
    if (!values.length) throw new Error("Tidak ada baris valid untuk diimpor.");
    const result = await repo.importRows(values, actor, options.update);
    refresh();
    return { ok: true, data: result };
  } catch (error) {
    return fail(error);
  }
}

export async function saveIndicator(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = indicatorInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Periksa kembali isian indikator.", fields: fieldErrors(parsed.error.issues) };
  try {
    await manager();
    const id = await repo.saveIndicator(parsed.data);
    refresh();
    return { ok: true, data: { id } };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteIndicator(id: string): Promise<ActionResult> {
  try {
    arg(idSchema, id);
    await manager();
    await repo.deleteIndicator(id);
    refresh();
    return { ok: true, data: undefined };
  } catch (error) {
    return fail(error);
  }
}
