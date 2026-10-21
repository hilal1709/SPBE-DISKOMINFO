"use server";
import { suggestInfrastruktur as suggest, type InfrastrukturSuggestion } from "@/lib/ai/infrastruktur-suggest";
import { can, currentActor, reviewTeam, stageOf, reviewTarget } from "@/lib/access";
import { listAplikasi } from "@/lib/aplikasi/cms-repo";
import { fail, refresh, type ActionResult } from "@/lib/cms/result";
import { assertAiInput, assertAiQuota } from "@/lib/security/rate-limit";
import { securityRefs } from "@/lib/keamanan/cms-repo";
import { resolveSecurity } from "@/lib/keamanan/link";
import { listData } from "@/lib/data/cms-repo";
import type { DepRef } from "@/lib/data/import";
import * as repo from "@/lib/infrastruktur/cms-repo";
import { readUpload, validateRows, type InfrastrukturImportResult, type InfrastrukturImportRow } from "@/lib/infrastruktur/import";
import type { InfraJenis } from "@/lib/infrastruktur/jenis";
import { rai } from "@/lib/infrastruktur/rai";
import { makeInfrastrukturInput, type InfrastrukturInput } from "@/lib/infrastruktur/schema";
import * as periods from "@/lib/probis/periods";
import { listProbis, opdCodeOf, opdIdOf } from "@/lib/probis/repo";
import { refResolver } from "@/lib/reference/versioned";
import type { SubmissionStatus } from "@/lib/types";

/** Indeks RAI untuk periode tertentu (versi milik periode itu). */
async function raiFor() {
  return refResolver(await rai.loadSet());
}

/** Operator hanya boleh menyimpan untuk OPD-nya sendiri (instansi pemilik). */
async function assertOpd(opdCode: string) {
  const actor = await currentActor();
  const locked = can.lockedOpd(actor);
  if (locked && (await opdIdOf(opdCode)) !== locked) throw new Error("Anda hanya dapat mengisi komponen milik OPD Anda.");
  return actor;
}

export async function saveInfrastruktur(input: InfrastrukturInput, options: { id?: string; submit: boolean }): Promise<ActionResult<{ id: string }>> {
  const parsed = makeInfrastrukturInput((await raiFor())(input.period)).safeParse(input);
  if (!parsed.success) {
    const fields = Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]));
    return { ok: false, error: "Periksa kembali isian yang ditandai.", fields };
  }
  try {
    const actor = await assertOpd(parsed.data.opd);
    let id: string;
    if (options.id) {
      const current = await repo.getInfrastruktur(options.id);
      if (!current) throw new Error("Komponen infrastruktur tidak ditemukan.");
      if (!can.edit(actor, current)) throw new Error("Komponen ini tidak dapat diubah pada status sekarang.");
      id = await repo.updateInfrastruktur(options.id, parsed.data, actor, options.submit);
    } else {
      if (!can.create(actor)) throw new Error("Peran Anda tidak dapat menambah komponen infrastruktur.");
      id = await repo.createInfrastruktur(parsed.data, actor, options.submit);
    }
    refresh();
    return { ok: true, data: { id } };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteInfrastruktur(id: string): Promise<ActionResult> {
  try {
    const actor = await currentActor();
    const current = await repo.getInfrastruktur(id);
    if (!current) throw new Error("Komponen infrastruktur tidak ditemukan.");
    if (!can.edit(actor, current)) throw new Error("Hanya draf atau komponen yang dikembalikan yang dapat dihapus.");
    await repo.deleteInfrastruktur(id);
    refresh();
    return { ok: true, data: undefined };
  } catch (error) {
    return fail(error);
  }
}

/**
 * Ajukan (operator), verifikasi (Verifikator Infrastruktur Diskominfo), validasi (Validator Diskominfo), atau kembalikan.
 * Tahap dicek terhadap status saat ini: verifikasi hanya dari "Diajukan", validasi hanya dari "Terverifikasi".
 */
export async function reviewInfrastruktur(id: string, decision: "submit" | "verify" | "validate" | "reject", note?: string): Promise<ActionResult<{ status: SubmissionStatus }>> {
  try {
    const actor = await currentActor();
    const current = await repo.getInfrastruktur(id);
    if (!current) throw new Error("Komponen infrastruktur tidak ditemukan.");
    const from = current.status;
    let to: SubmissionStatus;
    let text = note?.trim() || null;

    if (decision === "submit") {
      if (!can.edit(actor, current)) throw new Error("Komponen ini tidak dapat diajukan.");
      to = "submitted";
    } else {
      const stage = stageOf(from);
      if (!stage) throw new Error("Komponen ini tidak sedang dalam antrean pemeriksaan.");
      const team = reviewTeam(stage, "infrastruktur");
      if (!can.review(actor, stage, "infrastruktur")) throw new Error(`Hanya tim ${team} yang dapat memproses tahap ini.`);
      if (decision === "verify" && stage !== "verifikasi") throw new Error("Komponen ini sudah melewati tahap verifikasi.");
      if (decision === "validate" && stage !== "validasi") throw new Error("Komponen ini belum diverifikasi Verifikator Infrastruktur.");
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

export async function getInfrastrukturReviews(id: string) {
  const actor = await currentActor();
  const current = await repo.getInfrastruktur(id);
  if (!current || !can.read(actor, current.opdId)) return [];
  return repo.getReviews(id);
}

/** Pilihan relasi: komponen lain, aplikasi, data, dan probis tervalidasi pada periode yang sama. */
export async function listInfraOptions(opd: string, period: string): Promise<ActionResult<Awaited<ReturnType<typeof repo.dependencyOptions>>>> {
  try {
    const actor = await currentActor();
    const locked = can.lockedOpd(actor);
    if (locked && (await opdIdOf(opd)) !== locked) throw new Error("Anda hanya dapat melihat data OPD Anda.");
    if (!period) return { ok: true, data: { infra: [], aplikasi: [], data: [], probis: [] } };
    return { ok: true, data: await repo.dependencyOptions(opd, period) };
  } catch (error) {
    return fail(error);
  }
}

export async function suggestInfrastruktur(input: { name: string; opd: string; jenis?: InfraJenis | null; note?: string; period?: string }): Promise<ActionResult<InfrastrukturSuggestion>> {
  try {
    await assertAiQuota((await currentActor()).id);
    assertAiInput(input);
    if (input.name.trim().length < 2) throw new Error("Isi nama komponen terlebih dahulu.");
    const [raiSet, deps] = await Promise.all([rai.loadSet(), input.period ? repo.dependencyOptions(input.opd, input.period) : Promise.resolve({ infra: [] })]);
    const data = await suggest({ name: input.name.trim(), opd: input.opd, jenis: input.jenis, note: input.note?.trim() }, refResolver(raiSet)(input.period), deps.infra);
    return { ok: true, data };
  } catch (error) {
    return fail(error);
  }
}

/** Komponen, aplikasi, data & probis tervalidasi seluruh periode (kode, nama, OPD) untuk mencocokkan kolom relasi saat impor. */
async function dependencyRefs(): Promise<{ infra: DepRef[]; aplikasi: DepRef[]; data: DepRef[]; probis: DepRef[] }> {
  const [infra, aplikasi, data, probis] = await Promise.all([repo.listInfrastruktur(), listAplikasi(), listData(), listProbis({ statuses: ["approved"] })]);
  return {
    infra: infra.map((i) => ({ code: i.code, name: i.name, opd: i.opdCode, period: i.period })),
    aplikasi: aplikasi.map((a) => ({ code: a.code, name: a.name, opd: a.opdCode, period: a.period })),
    data: data.map((d) => ({ code: d.code, name: d.name, opd: d.opdCode, period: d.period })),
    probis: probis.map((p) => ({ code: p.code, name: p.name, opd: p.opdCode, period: p.period })),
  };
}

async function importContext(codes: string[]) {
  const actor = await currentActor();
  if (!can.import(actor)) throw new Error("Peran Anda tidak dapat mengimpor infrastruktur.");
  const locked = can.lockedOpd(actor);
  const [lockedOpd, existing, options, resolver, deps] = await Promise.all([locked ? opdCodeOf(locked) : null, repo.existingCodes(codes), periods.periodOptions(), raiFor(), dependencyRefs()]);
  return { actor, ctx: { existing, lockedOpd, periods: options, raiFor: resolver, ...deps } };
}

/** Langkah 1 impor: baca berkas, validasi baris, kembalikan pratinjau. */
export async function previewInfrastrukturImport(form: FormData): Promise<ActionResult<InfrastrukturImportResult>> {
  try {
    // Izin dicek sebelum berkas dibaca: mengurai .xlsx/.zip itu berat dan tidak boleh dipicu tanpa hak impor.
    if (!can.import(await currentActor())) throw new Error("Peran Anda tidak dapat mengimpor data.");
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
export async function commitInfrastrukturImport(
  rows: InfrastrukturImportRow[],
  options: { status: "draft" | "submitted"; update: boolean },
): Promise<ActionResult<{ created: number; updated: number; skipped: number }>> {
  try {
    const [{ actor, ctx }, refs] = await Promise.all([importContext(rows.map((r) => r.code).filter((c): c is string => !!c)), securityRefs()]);
    const valid = validateRows(rows, ctx).filter((r) => !r.issues.some((i) => i.level === "error"));
    const values = valid.map((r) => {
      const parsed = makeInfrastrukturInput(ctx.raiFor(r.period)).parse({
        opd: r.opd ?? "",
        jenis: r.jenis,
        name: r.name,
        period: r.period,
        deskripsi: r.deskripsi ?? undefined,
        pemilik: r.pemilik ?? undefined,
        kepemilikan: r.kepemilikan ?? undefined,
        pengelola: r.pengelola ?? undefined,
        rai: r.rai ?? "",
        atribut: r.atribut,
        aplikasi: r.aplikasi,
        data: r.data,
        probis: r.probis,
        // Isian keamanan (kode, "kode nama", atau nama) ditautkan ke kegiatan keamanan tervalidasi periode yang sama.
        security: resolveSecurity(r.security, r.period, refs),
      });
      // Relasi antarkomponen (kode atau nama) ditautkan repo setelah semua baris tersimpan.
      return { ...parsed, relasi: r.relasi, code: r.code };
    });
    if (!values.length) throw new Error("Tidak ada baris valid untuk diimpor.");
    const result = await repo.importRows(values, actor, options.status, options.update);
    refresh();
    return { ok: true, data: result };
  } catch (error) {
    return fail(error);
  }
}
