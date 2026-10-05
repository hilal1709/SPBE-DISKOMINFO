"use server";
import { fail, refresh, type ActionResult } from "@/lib/cms/result";
import { suggestProbis as suggest, type ProbisSuggestion } from "@/lib/ai/probis-suggest";
import { can, currentActor, stageOf } from "@/lib/access";
import * as periods from "@/lib/probis/periods";
import { readUpload, validateRows, type ImportResult, type ImportRow } from "@/lib/probis/import";
import * as repo from "@/lib/probis/repo";
import * as dataRepo from "@/lib/data/cms-repo";
import * as radRepo from "@/lib/data/rad";
import * as layananRepo from "@/lib/layanan/cms-repo";
import * as rabRepo from "@/lib/probis/rab";
import * as ralRepo from "@/lib/layanan/ral";
import type { RefKind, VersionedRef } from "@/lib/reference/versioned";
import type { RabStatus } from "@/lib/probis/rab-index";
import { makeProbisInput, type ProbisInput } from "@/lib/probis/schema";
import type { SubmissionStatus } from "@/lib/types";

export type { ActionResult } from "@/lib/cms/result";

/** Operator hanya boleh menyimpan untuk OPD-nya sendiri. */
async function assertOpd(opdCode: string) {
  const actor = await currentActor();
  const locked = can.lockedOpd(actor);
  if (locked && (await repo.opdIdOf(opdCode)) !== locked) throw new Error("Anda hanya dapat mengisi probis untuk OPD Anda.");
  return actor;
}

/** Indeks RAB untuk periode tertentu (versi RAB milik periode itu). */
async function rabFor() {
  return rabRepo.rabResolver(await rabRepo.loadRabSet());
}

export async function saveProbis(input: ProbisInput, options: { id?: string; submit: boolean }): Promise<ActionResult<{ id: string }>> {
  const parsed = makeProbisInput((await rabFor())(input.period)).safeParse(input);
  if (!parsed.success) {
    const fields = Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]));
    return { ok: false, error: "Periksa kembali isian yang ditandai.", fields };
  }
  try {
    const actor = await assertOpd(parsed.data.opd);
    let id: string;
    if (options.id) {
      const current = await repo.getProbis(options.id);
      if (!current) throw new Error("Probis tidak ditemukan.");
      if (!can.edit(actor, current)) throw new Error("Probis ini tidak dapat diubah pada status sekarang.");
      id = await repo.updateProbis(options.id, parsed.data, actor, options.submit);
    } else {
      if (!can.create(actor)) throw new Error("Peran Anda tidak dapat menambah probis.");
      id = await repo.createProbis(parsed.data, actor, options.submit);
    }
    refresh();
    return { ok: true, data: { id } };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteProbis(id: string): Promise<ActionResult> {
  try {
    const actor = await currentActor();
    const current = await repo.getProbis(id);
    if (!current) throw new Error("Probis tidak ditemukan.");
    if (!can.edit(actor, current)) throw new Error("Hanya draf atau probis yang dikembalikan yang dapat dihapus.");
    await repo.deleteProbis(id);
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
export async function reviewProbis(id: string, decision: "submit" | "verify" | "validate" | "reject", note?: string): Promise<ActionResult<{ status: SubmissionStatus }>> {
  try {
    const actor = await currentActor();
    const current = await repo.getProbis(id);
    if (!current) throw new Error("Probis tidak ditemukan.");
    const from = current.status;
    let to: SubmissionStatus;
    let text = note?.trim() || null;

    if (decision === "submit") {
      if (!can.edit(actor, current)) throw new Error("Probis ini tidak dapat diajukan.");
      to = "submitted";
    } else {
      const stage = stageOf(from);
      if (!stage) throw new Error("Probis ini tidak sedang dalam antrean pemeriksaan.");
      if (!can.review(actor, stage)) throw new Error(`Hanya tim ${stage} yang dapat memproses tahap ini.`);
      if (decision === "verify" && stage !== "verifikasi") throw new Error("Probis ini sudah melewati tahap verifikasi.");
      if (decision === "validate" && stage !== "validasi") throw new Error("Probis ini belum diverifikasi Bagian Organisasi.");
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

export async function getProbisReviews(id: string) {
  await currentActor();
  return repo.getReviews(id);
}

export async function suggestProbis(input: { name: string; opd: string; note?: string; period?: string }): Promise<ActionResult<ProbisSuggestion>> {
  try {
    await currentActor();
    if (input.name.trim().length < 3) throw new Error("Isi nama proses bisnis terlebih dahulu.");
    const rab = (await rabFor())(input.period);
    return { ok: true, data: await suggest({ name: input.name.trim(), opd: input.opd, note: input.note?.trim() }, rab) };
  } catch (error) {
    return fail(error);
  }
}

/** Langkah 1 impor: baca berkas, validasi baris, kembalikan pratinjau. */
export async function previewImport(form: FormData): Promise<ActionResult<ImportResult>> {
  try {
    const actor = await currentActor();
    if (!can.import(actor)) throw new Error("Peran Anda tidak dapat mengimpor data.");
    const file = form.get("file");
    if (!(file instanceof File) || !file.size) throw new Error("Pilih berkas .xlsx atau .zip.");
    const upload = readUpload(file.name, new Uint8Array(await file.arrayBuffer()));
    const locked = can.lockedOpd(actor);
    const lockedOpd = locked ? await repo.opdCodeOf(locked) : null;
    const existing = await repo.existingCodes(upload.rows.map((r) => r.code).filter((c): c is string => !!c));
    return { ok: true, data: { file: upload.file, unsupported: upload.unsupported, rows: validateRows(upload.rows, { existing, lockedOpd, periods: await periods.periodOptions(), rabFor: await rabFor() }) } };
  } catch (error) {
    return fail(error);
  }
}

/** Langkah 2 impor: simpan baris tanpa galat. Validasi diulang di server. */
export async function commitImport(rows: ImportRow[], options: { status: "draft" | "submitted"; update: boolean }): Promise<ActionResult<{ created: number; updated: number; skipped: number }>> {
  try {
    const actor = await currentActor();
    if (!can.import(actor)) throw new Error("Peran Anda tidak dapat mengimpor data.");
    const locked = can.lockedOpd(actor);
    const lockedOpd = locked ? await repo.opdCodeOf(locked) : null;
    const existing = await repo.existingCodes(rows.map((r) => r.code).filter((c): c is string => !!c));
    const resolve = await rabFor();
    const valid = validateRows(rows, { existing, lockedOpd, periods: await periods.periodOptions(), rabFor: resolve }).filter((r) => !r.issues.some((i) => i.level === "error"));
    const values = valid.map((r) => ({
      ...makeProbisInput(resolve(r.period)).parse({
        opd: r.opd,
        name: r.name,
        description: r.description ?? undefined,
        probisStatus: r.probisStatus,
        period: r.period,
        rab3: r.rab3,
        rabL4: r.rabL4 ?? undefined,
        rabL5: r.rabL5 ?? undefined,
        strategicGoal: r.strategicGoal ?? undefined,
        iku: r.iku ?? undefined,
        ikuTarget: r.ikuTarget ?? undefined,
        ikuRealization: r.ikuRealization ?? undefined,
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

/* ---------- Periode arsitektur ---------- */

async function periodAdmin() {
  const actor = await currentActor();
  if (!can.managePeriods(actor)) throw new Error("Hanya tim Diskominfo yang dapat mengelola periode.");
}

export async function createPeriod(start: number, end: number): Promise<ActionResult<{ name: string }>> {
  try {
    await periodAdmin();
    const name = await periods.createPeriod(start, end);
    refresh();
    return { ok: true, data: { name } };
  } catch (error) {
    return fail(error);
  }
}

export async function setActivePeriod(id: string): Promise<ActionResult> {
  try {
    await periodAdmin();
    await periods.setActivePeriod(id);
    refresh();
    return { ok: true, data: undefined };
  } catch (error) {
    return fail(error);
  }
}

export async function deletePeriod(id: string): Promise<ActionResult> {
  try {
    await periodAdmin();
    await periods.deletePeriod(id);
    refresh();
    return { ok: true, data: undefined };
  } catch (error) {
    return fail(error);
  }
}

/** Hapus semua data contoh (sebelum data asli diimpor). */
export async function clearSamples(): Promise<ActionResult<{ removed: number }>> {
  try {
    const actor = await currentActor();
    if (!can.managePeriods(actor)) throw new Error("Hanya tim Diskominfo yang dapat menghapus data contoh.");
    // Data & layanan contoh dihapus dulu: tautannya ke probis contoh ikut terlepas.
    const removed = (await dataRepo.clearSamples()) + (await layananRepo.clearSamples()) + (await repo.clearSamples());
    refresh();
    return { ok: true, data: { removed } };
  } catch (error) {
    return fail(error);
  }
}

/* ---------- Referensi berversi (RAB untuk probis, RAL untuk layanan, RAD untuk data) ---------- */

const refs = { rab: rabRepo.rab, ral: ralRepo.ral, rad: radRepo.rad } satisfies Record<RefKind, VersionedRef>;

async function refAdmin(kind: RefKind) {
  const actor = await currentActor();
  if (!can.manageReference(actor)) throw new Error(`Hanya pengelola referensi arsitektur yang dapat mengubah ${refs[kind].label}.`);
  return actor;
}

const run = async <T,>(kind: RefKind, task: (ref: VersionedRef, actor: Awaited<ReturnType<typeof refAdmin>>) => Promise<T>): Promise<ActionResult<T>> => {
  try {
    if (!(kind in refs)) throw new Error("Jenis referensi tidak dikenal.");
    const actor = await refAdmin(kind);
    const data = await task(refs[kind], actor);
    refresh();
    return { ok: true, data };
  } catch (error) {
    return fail(error);
  }
};

export async function createRefVersion(kind: RefKind, fromId: string, name: string, note?: string) {
  return run(kind, (ref, actor) => ref.createVersion(fromId, name, note ?? null, actor));
}

export async function updateRefNode(kind: RefKind, id: string, patch: { code?: string; name?: string; parentId?: string | null }) {
  return run(kind, (ref, actor) => ref.updateNode(id, patch, actor));
}

export async function addRefNode(kind: RefKind, versionId: string, parentId: string | null, code: string, name: string) {
  return run(kind, (ref, actor) => ref.addNode(versionId, parentId, code, name, actor));
}

export async function deleteRefNode(kind: RefKind, id: string) {
  return run(kind, (ref, actor) => ref.deleteNode(id, actor));
}

export async function setRefNodeStatus(kind: RefKind, id: string, status: RabStatus) {
  return run(kind, (ref, actor) => ref.setNodeStatus(id, status, actor));
}

export async function publishRefVersion(kind: RefKind, id: string) {
  return run(kind, (ref, actor) => ref.publishVersion(id, actor));
}

export async function deleteRefVersion(kind: RefKind, id: string) {
  return run(kind, (ref) => ref.deleteVersion(id));
}

/** Pakai versi referensi lain untuk satu periode; RAB tiap probis / RAL tiap layanan dipetakan ulang otomatis. */
export async function setPeriodRefVersion(kind: RefKind, periodId: string, versionId: string) {
  return run(kind, (ref, actor) => ref.remapPeriod(periodId, versionId, actor));
}
