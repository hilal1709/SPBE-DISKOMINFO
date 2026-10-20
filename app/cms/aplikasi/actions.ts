"use server";
import { suggestAplikasi as suggest, type AplikasiSuggestion } from "@/lib/ai/aplikasi-suggest";
import { can, currentActor, reviewTeam, stageOf } from "@/lib/access";
import * as repo from "@/lib/aplikasi/cms-repo";
import { readUpload, validateRows, type AplikasiImportResult, type AplikasiImportRow } from "@/lib/aplikasi/import";
import { raa } from "@/lib/aplikasi/raa";
import { makeAplikasiInput, type AplikasiInput } from "@/lib/aplikasi/schema";
import { fail, refresh, type ActionResult } from "@/lib/cms/result";
import { listData } from "@/lib/data/cms-repo";
import type { DepRef } from "@/lib/data/import";
import { listLayanan } from "@/lib/layanan/cms-repo";
import * as periods from "@/lib/probis/periods";
import { listProbis, opdCodeOf, opdIdOf } from "@/lib/probis/repo";
import { refResolver } from "@/lib/reference/versioned";
import type { SubmissionStatus } from "@/lib/types";

/** Indeks RAA untuk periode tertentu (versi milik periode itu). */
async function raaFor() {
  return refResolver(await raa.loadSet());
}

/** Operator hanya boleh menyimpan untuk OPD-nya sendiri (unit operasional teknologi). */
async function assertOpd(opdCode: string) {
  const actor = await currentActor();
  const locked = can.lockedOpd(actor);
  if (locked && (await opdIdOf(opdCode)) !== locked) throw new Error("Anda hanya dapat mengisi aplikasi yang dioperasikan OPD Anda.");
  return actor;
}

export async function saveAplikasi(input: AplikasiInput, options: { id?: string; submit: boolean }): Promise<ActionResult<{ id: string }>> {
  const parsed = makeAplikasiInput((await raaFor())(input.period)).safeParse(input);
  if (!parsed.success) {
    const fields = Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]));
    return { ok: false, error: "Periksa kembali isian yang ditandai.", fields };
  }
  try {
    const actor = await assertOpd(parsed.data.opd);
    let id: string;
    if (options.id) {
      const current = await repo.getAplikasi(options.id);
      if (!current) throw new Error("Aplikasi tidak ditemukan.");
      if (!can.edit(actor, current)) throw new Error("Aplikasi ini tidak dapat diubah pada status sekarang.");
      id = await repo.updateAplikasi(options.id, parsed.data, actor, options.submit);
    } else {
      if (!can.create(actor)) throw new Error("Peran Anda tidak dapat menambah aplikasi.");
      id = await repo.createAplikasi(parsed.data, actor, options.submit);
    }
    refresh();
    return { ok: true, data: { id } };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteAplikasi(id: string): Promise<ActionResult> {
  try {
    const actor = await currentActor();
    const current = await repo.getAplikasi(id);
    if (!current) throw new Error("Aplikasi tidak ditemukan.");
    if (!can.edit(actor, current)) throw new Error("Hanya draf atau aplikasi yang dikembalikan yang dapat dihapus.");
    await repo.deleteAplikasi(id);
    refresh();
    return { ok: true, data: undefined };
  } catch (error) {
    return fail(error);
  }
}

/**
 * Ajukan (operator), verifikasi (Verifikator Aplikasi Diskominfo), validasi (Validator Diskominfo), atau kembalikan.
 * Tahap dicek terhadap status saat ini: verifikasi hanya dari "Diajukan", validasi hanya dari "Terverifikasi".
 */
export async function reviewAplikasi(id: string, decision: "submit" | "verify" | "validate" | "reject", note?: string): Promise<ActionResult<{ status: SubmissionStatus }>> {
  try {
    const actor = await currentActor();
    const current = await repo.getAplikasi(id);
    if (!current) throw new Error("Aplikasi tidak ditemukan.");
    const from = current.status;
    let to: SubmissionStatus;
    let text = note?.trim() || null;

    if (decision === "submit") {
      if (!can.edit(actor, current)) throw new Error("Aplikasi ini tidak dapat diajukan.");
      to = "submitted";
    } else {
      const stage = stageOf(from);
      if (!stage) throw new Error("Aplikasi ini tidak sedang dalam antrean pemeriksaan.");
      const team = reviewTeam(stage, "aplikasi");
      if (!can.review(actor, stage, "aplikasi")) throw new Error(`Hanya tim ${team} yang dapat memproses tahap ini.`);
      if (decision === "verify" && stage !== "verifikasi") throw new Error("Aplikasi ini sudah melewati tahap verifikasi.");
      if (decision === "validate" && stage !== "validasi") throw new Error("Aplikasi ini belum diverifikasi Verifikator Aplikasi.");
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

export async function getAplikasiReviews(id: string) {
  await currentActor();
  return repo.getReviews(id);
}

/** Pilihan dependensi: probis tervalidasi, layanan, dan data pada periode yang sama. */
export async function listDependencyOptions(opd: string, period: string): Promise<ActionResult<Awaited<ReturnType<typeof repo.dependencyOptions>>>> {
  try {
    await currentActor();
    if (!period) return { ok: true, data: { probis: [], layanan: [], data: [] } };
    return { ok: true, data: await repo.dependencyOptions(opd, period) };
  } catch (error) {
    return fail(error);
  }
}

export async function suggestAplikasi(input: { name: string; opd: string; pengembang?: string; note?: string; period?: string }): Promise<ActionResult<AplikasiSuggestion>> {
  try {
    await currentActor();
    if (input.name.trim().length < 2) throw new Error("Isi nama aplikasi terlebih dahulu.");
    const [raaSet, deps] = await Promise.all([raa.loadSet(), input.period ? repo.dependencyOptions(input.opd, input.period) : Promise.resolve({ probis: [], layanan: [], data: [] })]);
    const data = await suggest({ name: input.name.trim(), opd: input.opd, pengembang: input.pengembang, note: input.note?.trim() }, refResolver(raaSet)(input.period), deps);
    return { ok: true, data };
  } catch (error) {
    return fail(error);
  }
}

/** Probis tervalidasi, layanan & data seluruh periode (kode, nama, OPD) untuk mencocokkan kolom dependensi saat impor. */
async function dependencyRefs(): Promise<{ probis: DepRef[]; layanan: DepRef[]; data: DepRef[] }> {
  const [probis, layanan, data] = await Promise.all([listProbis({ statuses: ["approved"] }), listLayanan(), listData()]);
  return {
    probis: probis.map((p) => ({ code: p.code, name: p.name, opd: p.opdCode, period: p.period })),
    layanan: layanan.map((l) => ({ code: l.code, name: l.name, opd: l.opdCode, period: l.period })),
    data: data.map((d) => ({ code: d.code, name: d.name, opd: d.opdCode, period: d.period })),
  };
}

async function importContext(codes: string[]) {
  const actor = await currentActor();
  if (!can.import(actor)) throw new Error("Peran Anda tidak dapat mengimpor aplikasi.");
  const locked = can.lockedOpd(actor);
  const [lockedOpd, existing, options, resolver, deps] = await Promise.all([locked ? opdCodeOf(locked) : null, repo.existingCodes(codes), periods.periodOptions(), raaFor(), dependencyRefs()]);
  return { actor, ctx: { existing, lockedOpd, periods: options, raaFor: resolver, ...deps } };
}

/** Langkah 1 impor: baca berkas, validasi baris, kembalikan pratinjau. */
export async function previewAplikasiImport(form: FormData): Promise<ActionResult<AplikasiImportResult>> {
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
export async function commitAplikasiImport(rows: AplikasiImportRow[], options: { status: "draft" | "submitted"; update: boolean }): Promise<ActionResult<{ created: number; updated: number; skipped: number }>> {
  try {
    const { actor, ctx } = await importContext(rows.map((r) => r.code).filter((c): c is string => !!c));
    const valid = validateRows(rows, ctx).filter((r) => !r.issues.some((i) => i.level === "error"));
    const values = valid.map((r) => ({
      ...makeAplikasiInput(ctx.raaFor(r.period)).parse({
        opd: r.opd ?? "",
        name: r.name,
        period: r.period,
        uraian: r.uraian ?? "",
        fungsi: r.fungsi ?? "",
        luaran: r.luaran ?? "",
        mesin: r.mesin ?? undefined,
        basis: r.basis!,
        lisensi: r.lisensi!,
        bahasa: r.bahasa ?? "Tidak diketahui",
        kerangka: r.kerangka ?? undefined,
        pengembang: r.pengembang ?? r.opd ?? "",
        raa: r.raa ?? "",
        probis: r.probis,
        layanan: r.layanan,
        data: r.data,
        inputData: r.inputData ?? undefined,
        outputData: r.outputData ?? undefined,
        supplier: r.supplier ?? undefined,
        customer: r.customer ?? undefined,
        cloud: r.cloud ?? undefined,
        server: r.server ?? undefined,
        splp: r.splp ?? undefined,
        jip: r.jip ?? undefined,
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
