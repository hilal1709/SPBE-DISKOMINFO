"use server";
import { suggestLayanan as suggest, type LayananSuggestion } from "@/lib/ai/layanan-suggest";
import { can, currentActor, stageOf } from "@/lib/access";
import { fail, refresh, type ActionResult } from "@/lib/cms/result";
import * as repo from "@/lib/layanan/cms-repo";
import { readUpload, validateRows, type LayananImportResult, type LayananImportRow, type ProbisRef } from "@/lib/layanan/import";
import { ral } from "@/lib/layanan/ral";
import { makeLayananInput, type LayananInput } from "@/lib/layanan/schema";
import * as periods from "@/lib/probis/periods";
import { rab } from "@/lib/probis/rab";
import { listProbis, opdCodeOf, opdIdOf } from "@/lib/probis/repo";
import { refResolver } from "@/lib/reference/versioned";
import type { SubmissionStatus } from "@/lib/types";

/** Indeks RAL dan RAB untuk periode tertentu (versi milik periode itu). */
async function refsFor() {
  const [ralSet, rabSet] = await Promise.all([ral.loadSet(), rab.loadSet()]);
  return { ralFor: refResolver(ralSet), rabFor: refResolver(rabSet) };
}

/** Operator hanya boleh menyimpan untuk OPD-nya sendiri. */
async function assertOpd(opdCode: string) {
  const actor = await currentActor();
  const locked = can.lockedOpd(actor);
  if (locked && (await opdIdOf(opdCode)) !== locked) throw new Error("Anda hanya dapat mengisi layanan untuk OPD Anda.");
  return actor;
}

export async function saveLayanan(input: LayananInput, options: { id?: string; submit: boolean }): Promise<ActionResult<{ id: string }>> {
  const { ralFor, rabFor } = await refsFor();
  const parsed = makeLayananInput(ralFor(input.period), rabFor(input.period)).safeParse(input);
  if (!parsed.success) {
    const fields = Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]));
    return { ok: false, error: "Periksa kembali isian yang ditandai.", fields };
  }
  try {
    const actor = await assertOpd(parsed.data.opd);
    let id: string;
    if (options.id) {
      const current = await repo.getLayanan(options.id);
      if (!current) throw new Error("Layanan tidak ditemukan.");
      if (!can.edit(actor, current)) throw new Error("Layanan ini tidak dapat diubah pada status sekarang.");
      id = await repo.updateLayanan(options.id, parsed.data, actor, options.submit);
    } else {
      if (!can.create(actor)) throw new Error("Peran Anda tidak dapat menambah layanan.");
      id = await repo.createLayanan(parsed.data, actor, options.submit);
    }
    refresh();
    return { ok: true, data: { id } };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteLayanan(id: string): Promise<ActionResult> {
  try {
    const actor = await currentActor();
    const current = await repo.getLayanan(id);
    if (!current) throw new Error("Layanan tidak ditemukan.");
    if (!can.edit(actor, current)) throw new Error("Hanya draf atau layanan yang dikembalikan yang dapat dihapus.");
    await repo.deleteLayanan(id);
    refresh();
    return { ok: true, data: undefined };
  } catch (error) {
    return fail(error);
  }
}

/**
 * Ajukan (operator), verifikasi (tim Bagian Organisasi), validasi (tim Diskominfo), atau kembalikan.
 * Tahap dicek terhadap status saat ini: verifikasi hanya dari "Diajukan", validasi hanya dari "Terverifikasi".
 */
export async function reviewLayanan(id: string, decision: "submit" | "verify" | "validate" | "reject", note?: string): Promise<ActionResult<{ status: SubmissionStatus }>> {
  try {
    const actor = await currentActor();
    const current = await repo.getLayanan(id);
    if (!current) throw new Error("Layanan tidak ditemukan.");
    const from = current.status;
    let to: SubmissionStatus;
    let text = note?.trim() || null;

    if (decision === "submit") {
      if (!can.edit(actor, current)) throw new Error("Layanan ini tidak dapat diajukan.");
      to = "submitted";
    } else {
      const stage = stageOf(from);
      if (!stage) throw new Error("Layanan ini tidak sedang dalam antrean pemeriksaan.");
      if (!can.review(actor, stage)) throw new Error(`Hanya tim ${stage} yang dapat memproses tahap ini.`);
      if (decision === "verify" && stage !== "verifikasi") throw new Error("Layanan ini sudah melewati tahap verifikasi.");
      if (decision === "validate" && stage !== "validasi") throw new Error("Layanan ini belum diverifikasi Bagian Organisasi.");
      if (decision === "reject") {
        if (!text) throw new Error("Tuliskan catatan alasan pengembalian.");
        text = `Dikembalikan tim ${stage}: ${text}`;
      }
      to = decision === "reject" ? "rejected" : decision === "verify" ? "verified" : "approved";
    }

    await repo.transition(id, from, to, actor, text);
    refresh();
    return { ok: true, data: { status: to } };
  } catch (error) {
    return fail(error);
  }
}

export async function getLayananReviews(id: string) {
  await currentActor();
  return repo.getReviews(id);
}

/** Pilihan "Proses bisnis yang dilayani": probis OPD pada periode yang sama. */
export async function listProbisOptions(opd: string, period: string): Promise<ActionResult<{ code: string; name: string }[]>> {
  try {
    await currentActor();
    if (!opd || !period) return { ok: true, data: [] };
    return { ok: true, data: await repo.probisOptions(opd, period) };
  } catch (error) {
    return fail(error);
  }
}

export async function suggestLayanan(input: { name: string; opd: string; note?: string; period?: string }): Promise<ActionResult<LayananSuggestion>> {
  try {
    await currentActor();
    if (input.name.trim().length < 3) throw new Error("Isi nama layanan terlebih dahulu.");
    const { ralFor, rabFor } = await refsFor();
    return { ok: true, data: await suggest({ name: input.name.trim(), opd: input.opd, note: input.note?.trim() }, ralFor(input.period), rabFor(input.period)) };
  } catch (error) {
    return fail(error);
  }
}

/** Probis seluruh periode (kode, nama, OPD) untuk mencocokkan kolom "← Proses Bisnis" saat impor. */
async function probisRefs(): Promise<ProbisRef[]> {
  return (await listProbis()).map((p) => ({ code: p.code, name: p.name, opd: p.opdCode, period: p.period }));
}

async function importContext(codes: string[]) {
  const actor = await currentActor();
  if (!can.import(actor)) throw new Error("Peran Anda tidak dapat mengimpor data.");
  const locked = can.lockedOpd(actor);
  const [lockedOpd, existing, options, refs, probis] = await Promise.all([locked ? opdCodeOf(locked) : null, repo.existingCodes(codes), periods.periodOptions(), refsFor(), probisRefs()]);
  return { actor, ctx: { existing, lockedOpd, periods: options, ...refs, probis } };
}

/** Langkah 1 impor: baca berkas, validasi baris, kembalikan pratinjau. */
export async function previewLayananImport(form: FormData): Promise<ActionResult<LayananImportResult>> {
  try {
    const file = form.get("file");
    if (!(file instanceof File) || !file.size) throw new Error("Pilih berkas .xlsx atau .zip.");
    const upload = readUpload(file.name, new Uint8Array(await file.arrayBuffer()));
    const { ctx } = await importContext(upload.rows.map((r) => r.code).filter((c): c is string => !!c));
    return { ok: true, data: { file: upload.file, unsupported: upload.unsupported, rows: validateRows(upload.rows, ctx) } };
  } catch (error) {
    return fail(error);
  }
}

/** Langkah 2 impor: simpan baris tanpa galat. Validasi diulang di server. */
export async function commitLayananImport(rows: LayananImportRow[], options: { status: "draft" | "submitted"; update: boolean }): Promise<ActionResult<{ created: number; updated: number; skipped: number }>> {
  try {
    const { actor, ctx } = await importContext(rows.map((r) => r.code).filter((c): c is string => !!c));
    const valid = validateRows(rows, ctx).filter((r) => !r.issues.some((i) => i.level === "error"));
    const values = valid.map((r) => ({
      ...makeLayananInput(ctx.ralFor(r.period), ctx.rabFor(r.period)).parse({
        opd: r.opd ?? "",
        name: r.name,
        period: r.period,
        tujuan: r.tujuan ?? "",
        fungsi: r.fungsi ?? undefined,
        target: r.target!,
        metode: r.metode!,
        ral3: r.ral3 ?? "",
        ralL4: r.ralL4 ?? undefined,
        ralL5: r.ralL5 ?? undefined,
        rab2: r.rab2 ?? undefined,
        manfaat: r.manfaat ?? undefined,
        ekonomi: r.ekonomi ?? undefined,
        risiko: r.risiko ?? undefined,
        mitigasi: r.mitigasi ?? undefined,
        kl: r.kl ?? undefined,
        probis: r.probis,
      }),
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
