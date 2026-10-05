"use server";
import { suggestData as suggest, type DataSuggestion } from "@/lib/ai/data-suggest";
import { can, currentActor, reviewTeam, stageOf } from "@/lib/access";
import { fail, refresh, type ActionResult } from "@/lib/cms/result";
import * as repo from "@/lib/data/cms-repo";
import { readUpload, validateRows, type DataImportResult, type DataImportRow, type DepRef } from "@/lib/data/import";
import { rad } from "@/lib/data/rad";
import { makeDataInput, type DataInput } from "@/lib/data/schema";
import { listLayanan } from "@/lib/layanan/cms-repo";
import * as periods from "@/lib/probis/periods";
import { rab } from "@/lib/probis/rab";
import { listProbis, opdCodeOf, opdIdOf } from "@/lib/probis/repo";
import { refResolver } from "@/lib/reference/versioned";
import type { SubmissionStatus } from "@/lib/types";

/** Indeks RAD untuk periode tertentu (versi milik periode itu). */
async function radFor() {
  return refResolver(await rad.loadSet());
}

/** Operator hanya boleh menyimpan untuk OPD-nya sendiri. */
async function assertOpd(opdCode: string) {
  const actor = await currentActor();
  const locked = can.lockedOpd(actor);
  if (locked && (await opdIdOf(opdCode)) !== locked) throw new Error("Anda hanya dapat mengisi data untuk OPD Anda.");
  return actor;
}

export async function saveData(input: DataInput, options: { id?: string; submit: boolean }): Promise<ActionResult<{ id: string }>> {
  const parsed = makeDataInput((await radFor())(input.period)).safeParse(input);
  if (!parsed.success) {
    const fields = Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]));
    return { ok: false, error: "Periksa kembali isian yang ditandai.", fields };
  }
  try {
    const actor = await assertOpd(parsed.data.opd);
    let id: string;
    if (options.id) {
      const current = await repo.getData(options.id);
      if (!current) throw new Error("Data tidak ditemukan.");
      if (!can.edit(actor, current)) throw new Error("Data ini tidak dapat diubah pada status sekarang.");
      id = await repo.updateData(options.id, parsed.data, actor, options.submit);
    } else {
      if (!can.create(actor)) throw new Error("Peran Anda tidak dapat menambah data.");
      id = await repo.createData(parsed.data, actor, options.submit);
    }
    refresh();
    return { ok: true, data: { id } };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteData(id: string): Promise<ActionResult> {
  try {
    const actor = await currentActor();
    const current = await repo.getData(id);
    if (!current) throw new Error("Data tidak ditemukan.");
    if (!can.edit(actor, current)) throw new Error("Hanya draf atau data yang dikembalikan yang dapat dihapus.");
    await repo.deleteData(id);
    refresh();
    return { ok: true, data: undefined };
  } catch (error) {
    return fail(error);
  }
}

/**
 * Ajukan (operator), verifikasi (Verifikator Data Diskominfo), validasi (Validator Diskominfo), atau kembalikan.
 * Tahap dicek terhadap status saat ini: verifikasi hanya dari "Diajukan", validasi hanya dari "Terverifikasi".
 */
export async function reviewData(id: string, decision: "submit" | "verify" | "validate" | "reject", note?: string): Promise<ActionResult<{ status: SubmissionStatus }>> {
  try {
    const actor = await currentActor();
    const current = await repo.getData(id);
    if (!current) throw new Error("Data tidak ditemukan.");
    const from = current.status;
    let to: SubmissionStatus;
    let text = note?.trim() || null;

    if (decision === "submit") {
      if (!can.edit(actor, current)) throw new Error("Data ini tidak dapat diajukan.");
      to = "submitted";
    } else {
      const stage = stageOf(from);
      if (!stage) throw new Error("Data ini tidak sedang dalam antrean pemeriksaan.");
      const team = reviewTeam(stage, "data");
      if (!can.review(actor, stage, "data")) throw new Error(`Hanya tim ${team} yang dapat memproses tahap ini.`);
      if (decision === "verify" && stage !== "verifikasi") throw new Error("Data ini sudah melewati tahap verifikasi.");
      if (decision === "validate" && stage !== "validasi") throw new Error("Data ini belum diverifikasi Verifikator Data.");
      if (decision === "reject") {
        if (!text) throw new Error("Tuliskan catatan alasan pengembalian.");
        text = `Dikembalikan tim ${team}: ${text}`;
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

export async function getDataReviews(id: string) {
  await currentActor();
  return repo.getReviews(id);
}

/** Pilihan dependensi: probis OPD wali data dan layanan pada periode yang sama. */
export async function listDependencyOptions(opd: string, period: string): Promise<ActionResult<Awaited<ReturnType<typeof repo.dependencyOptions>>>> {
  try {
    await currentActor();
    if (!opd || !period) return { ok: true, data: { probis: [], layanan: [] } };
    return { ok: true, data: await repo.dependencyOptions(opd, period) };
  } catch (error) {
    return fail(error);
  }
}

export async function suggestData(input: { name: string; opd: string; note?: string; period?: string }): Promise<ActionResult<DataSuggestion>> {
  try {
    await currentActor();
    if (input.name.trim().length < 3) throw new Error("Isi nama data terlebih dahulu.");
    const [radSet, rabSet] = await Promise.all([rad.loadSet(), rab.loadSet()]);
    return { ok: true, data: await suggest({ name: input.name.trim(), opd: input.opd, note: input.note?.trim() }, refResolver(radSet)(input.period), refResolver(rabSet)(input.period)) };
  } catch (error) {
    return fail(error);
  }
}

/** Probis & layanan seluruh periode (kode, nama, OPD) untuk mencocokkan kolom dependensi saat impor. */
async function dependencyRefs(): Promise<{ probis: DepRef[]; layanan: DepRef[] }> {
  const [probis, layanan] = await Promise.all([listProbis(), listLayanan()]);
  return {
    probis: probis.map((p) => ({ code: p.code, name: p.name, opd: p.opdCode, period: p.period })),
    layanan: layanan.map((l) => ({ code: l.code, name: l.name, opd: l.opdCode, period: l.period })),
  };
}

async function importContext(codes: string[]) {
  const actor = await currentActor();
  if (!can.import(actor)) throw new Error("Peran Anda tidak dapat mengimpor data.");
  const locked = can.lockedOpd(actor);
  const [lockedOpd, existing, options, resolver, deps] = await Promise.all([locked ? opdCodeOf(locked) : null, repo.existingCodes(codes), periods.periodOptions(), radFor(), dependencyRefs()]);
  return { actor, ctx: { existing, lockedOpd, periods: options, radFor: resolver, ...deps } };
}

/** Langkah 1 impor: baca berkas, validasi baris, kembalikan pratinjau. */
export async function previewDataImport(form: FormData): Promise<ActionResult<DataImportResult>> {
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
export async function commitDataImport(rows: DataImportRow[], options: { status: "draft" | "submitted"; update: boolean }): Promise<ActionResult<{ created: number; updated: number; skipped: number }>> {
  try {
    const { actor, ctx } = await importContext(rows.map((r) => r.code).filter((c): c is string => !!c));
    const valid = validateRows(rows, ctx).filter((r) => !r.issues.some((i) => i.level === "error"));
    const values = valid.map((r) => ({
      ...makeDataInput(ctx.radFor(r.period)).parse({
        opd: r.opd ?? "",
        name: r.name,
        period: r.period,
        uraian: r.uraian ?? "",
        tujuan: r.tujuan ?? "",
        produsen: r.produsen ?? undefined,
        output: r.output ?? undefined,
        input: r.input ?? undefined,
        sifat: r.sifat!,
        jenis: r.jenis!,
        validitas: r.validitas!,
        interoperabel: r.interoperabel!,
        rad: r.rad ?? "",
        radL4: r.radL4 ?? undefined,
        radL5: r.radL5 ?? undefined,
        probis: r.probis,
        layanan: r.layanan,
        security: r.security,
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
