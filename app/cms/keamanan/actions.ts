"use server";
import { assertUploadFile } from "@/lib/security/upload";
import { arg, idSchema, importOptions, importRows, isValid, reviewArgs, saveOptions } from "@/lib/security/schemas";
import { suggestKeamanan as suggest, type KeamananSuggestion } from "@/lib/ai/keamanan-suggest";
import { can, currentActor, reviewTeam, stageOf, reviewTarget } from "@/lib/access";
import { fail, refresh, type ActionResult } from "@/lib/cms/result";
import { assertAiInput, assertAiQuota, assertImportQuota } from "@/lib/security/rate-limit";
import * as repo from "@/lib/keamanan/cms-repo";
import { readUpload, validateRows, type KeamananImportResult, type KeamananImportRow } from "@/lib/keamanan/import";
import type { Kegiatan } from "@/lib/keamanan/jenis";
import { keamananInput, type KeamananInput } from "@/lib/keamanan/schema";
import * as periods from "@/lib/probis/periods";
import { opdCodeOf, opdIdOf } from "@/lib/probis/repo";
import type { SubmissionStatus } from "@/lib/types";

/** Operator hanya boleh menyimpan untuk OPD-nya sendiri (instansi pelaksana). */
async function assertOpd(opdCode: string) {
  const actor = await currentActor();
  const locked = can.lockedOpd(actor);
  if (locked && (await opdIdOf(opdCode)) !== locked) throw new Error("Anda hanya dapat mengisi kegiatan OPD Anda.");
  return actor;
}

export async function saveKeamanan(input: KeamananInput, options: { id?: string; submit: boolean }): Promise<ActionResult<{ id: string }>> {
  if (!isValid(saveOptions, options)) return { ok: false, error: "Data tidak valid." };
  const parsed = keamananInput.safeParse(input);
  if (!parsed.success) {
    const fields = Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]));
    return { ok: false, error: "Periksa kembali isian yang ditandai.", fields };
  }
  try {
    const actor = await assertOpd(parsed.data.opd);
    let id: string;
    if (options.id) {
      const current = await repo.getKeamanan(options.id);
      if (!current) throw new Error("Kegiatan keamanan tidak ditemukan.");
      if (!can.edit(actor, current)) throw new Error("Kegiatan ini tidak dapat diubah pada status sekarang.");
      id = await repo.updateKeamanan(options.id, parsed.data, actor, options.submit);
    } else {
      if (!can.create(actor)) throw new Error("Peran Anda tidak dapat menambah kegiatan keamanan.");
      id = await repo.createKeamanan(parsed.data, actor, options.submit);
    }
    refresh();
    return { ok: true, data: { id } };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteKeamanan(id: string): Promise<ActionResult> {
  try {
    arg(idSchema, id);
    const actor = await currentActor();
    const current = await repo.getKeamanan(id);
    if (!current) throw new Error("Kegiatan keamanan tidak ditemukan.");
    if (!can.edit(actor, current)) throw new Error("Hanya draf atau kegiatan yang dikembalikan yang dapat dihapus.");
    await repo.deleteKeamanan(id);
    refresh();
    return { ok: true, data: undefined };
  } catch (error) {
    return fail(error);
  }
}

/**
 * Ajukan (operator), verifikasi (Verifikator Keamanan Diskominfo), validasi (Validator Diskominfo), atau kembalikan.
 * Tahap dicek terhadap status saat ini: verifikasi hanya dari "Diajukan", validasi hanya dari "Terverifikasi".
 */
export async function reviewKeamanan(id: string, decision: "submit" | "verify" | "validate" | "reject", note?: string): Promise<ActionResult<{ status: SubmissionStatus }>> {
  try {
    ({ id, decision, note } = arg(reviewArgs, { id, decision, note }));
    const actor = await currentActor();
    const current = await repo.getKeamanan(id);
    if (!current) throw new Error("Kegiatan keamanan tidak ditemukan.");
    const from = current.status;
    let to: SubmissionStatus;
    let text = note?.trim() || null;

    if (decision === "submit") {
      if (!can.edit(actor, current)) throw new Error("Kegiatan ini tidak dapat diajukan.");
      to = "submitted";
    } else {
      const stage = stageOf(from);
      if (!stage) throw new Error("Kegiatan ini tidak sedang dalam antrean pemeriksaan.");
      const team = reviewTeam(stage, "keamanan");
      if (!can.review(actor, stage, "keamanan")) throw new Error(`Hanya tim ${team} yang dapat memproses tahap ini.`);
      if (decision === "verify" && stage !== "verifikasi") throw new Error("Kegiatan ini sudah melewati tahap verifikasi.");
      if (decision === "validate" && stage !== "validasi") throw new Error("Kegiatan ini belum diverifikasi Verifikator Keamanan.");
      if (decision === "reject") {
        if (!text) throw new Error("Tuliskan catatan alasan pengembalian.");
        text = `Dikembalikan tim ${team}: ${text}`;
      }
      to = reviewTarget(decision, stage);
    }

    await repo.transition(id, from, to, actor, text);
    refresh();
    return { ok: true, data: { status: to } };
  } catch (error) {
    return fail(error);
  }
}

export async function getKeamananReviews(id: string) {
  if (!isValid(idSchema, id)) return [];
  const actor = await currentActor();
  const current = await repo.getKeamanan(id);
  if (!current || !can.read(actor, current.opdId)) return [];
  return repo.getReviews(id);
}

export async function suggestKeamanan(input: { name: string; opd: string; jenis?: Kegiatan | null; note?: string }): Promise<ActionResult<KeamananSuggestion>> {
  try {
    await assertAiQuota((await currentActor()).id);
    assertAiInput(input);
    if (input.name.trim().length < 3) throw new Error("Isi nama kegiatan terlebih dahulu.");
    return { ok: true, data: await suggest({ name: input.name.trim(), opd: input.opd, jenis: input.jenis, note: input.note?.trim() }) };
  } catch (error) {
    return fail(error);
  }
}

async function importContext(codes: string[]) {
  const actor = await currentActor();
  if (!can.import(actor)) throw new Error("Peran Anda tidak dapat mengimpor kegiatan keamanan.");
  const locked = can.lockedOpd(actor);
  const [lockedOpd, existing, options] = await Promise.all([locked ? opdCodeOf(locked) : null, repo.existingCodes(codes), periods.periodOptions()]);
  return { actor, ctx: { existing, lockedOpd, periods: options } };
}

/** Langkah 1 impor: baca berkas, validasi baris, kembalikan pratinjau. */
export async function previewKeamananImport(form: FormData): Promise<ActionResult<KeamananImportResult>> {
  try {
    // Izin dicek sebelum berkas dibaca: mengurai .xlsx/.zip itu berat dan tidak boleh dipicu tanpa hak impor.
    const actor = await currentActor();
    if (!can.import(actor)) throw new Error("Peran Anda tidak dapat mengimpor data.");
    await assertImportQuota(actor.id);
    const file = form.get("file");
    assertUploadFile(file, "Pilih berkas .xlsx atau .zip.");
    const upload = readUpload(file.name, new Uint8Array(await file.arrayBuffer()));
    const { ctx } = await importContext(upload.rows.map((r) => r.code).filter((c): c is string => !!c));
    return { ok: true, data: { file: upload.file, unsupported: upload.unsupported, rows: validateRows(upload.rows, ctx) } };
  } catch (error) {
    return fail(error);
  }
}

/** Langkah 2 impor: simpan baris tanpa galat. Validasi diulang di server. */
export async function commitKeamananImport(rows: KeamananImportRow[], options: { status: "draft" | "submitted"; update: boolean }): Promise<ActionResult<{ created: number; updated: number; skipped: number }>> {
  try {
    arg(importRows, rows);
    arg(importOptions, options);
    await assertImportQuota((await currentActor()).id);
    const { actor, ctx } = await importContext(rows.map((r) => r.code).filter((c): c is string => !!c));
    const valid = validateRows(rows, ctx).filter((r) => !r.issues.some((i) => i.level === "error"));
    const values = valid.map((r) => ({
      ...keamananInput.parse({ opd: r.opd ?? "", jenis: r.jenis, name: r.name, period: r.period, deskripsi: r.deskripsi ?? undefined, tanggal: r.tanggal ?? undefined, atribut: r.atribut }),
      code: r.code,
    }));
    if (!values.length) throw new Error("Tidak ada baris valid untuk diimpor.");
    const result = await repo.importRows(values, actor, options.status, options.update);
    refresh();
    return { ok: true, data: result };
  } catch (error) {
    return fail(error);
  }
}
