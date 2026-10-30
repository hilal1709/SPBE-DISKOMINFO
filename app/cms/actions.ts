"use server";
import { assertUploadFile } from "@/lib/security/upload";
import { z } from "zod";
import { arg, idSchema, importOptions, importRows, isValid, noteSchema, refCode, refName, reviewArgs, saveOptions, yearSchema } from "@/lib/security/schemas";
import { fail, refresh, type ActionResult } from "@/lib/cms/result";
import { assertAiInput, assertAiQuota, assertImportQuota } from "@/lib/security/rate-limit";
import { suggestProbis as suggest, type ProbisSuggestion } from "@/lib/ai/probis-suggest";
import { can, currentActor, stageOf, reviewTarget } from "@/lib/access";
import * as periods from "@/lib/probis/periods";
import { readUpload, validateRows, type ImportResult, type ImportRow } from "@/lib/probis/import";
import * as repo from "@/lib/probis/repo";
import * as aplikasiRepo from "@/lib/aplikasi/cms-repo";
import * as raaRepo from "@/lib/aplikasi/raa";
import * as infraRepo from "@/lib/infrastruktur/cms-repo";
import * as keamananRepo from "@/lib/keamanan/cms-repo";
import * as gapRepo from "@/lib/gap/cms-repo";
import * as rencanaRepo from "@/lib/peta-rencana/cms-repo";
import * as raiRepo from "@/lib/infrastruktur/rai";
import * as dataRepo from "@/lib/data/cms-repo";
import * as radRepo from "@/lib/data/rad";
import * as layananRepo from "@/lib/layanan/cms-repo";
import * as rabRepo from "@/lib/probis/rab";
import * as ralRepo from "@/lib/layanan/ral";
import type { RefKind, VersionedRef } from "@/lib/reference/versioned";
import type { RabStatus } from "@/lib/probis/rab-index";
import { diagramInput, makeProbisInput, type ProbisInput } from "@/lib/probis/schema";
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
  if (!isValid(saveOptions, options)) return { ok: false, error: "Data tidak valid." };
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
    arg(idSchema, id);
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
    ({ id, decision, note } = arg(reviewArgs, { id, decision, note }));
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
      to = reviewTarget(decision, stage);
    }

    await repo.transition(id, from, to, actor, text);
    refresh();
    return { ok: true, data: { status: to } };
  } catch (error) {
    return fail(error);
  }
}

export async function getProbisReviews(id: string) {
  if (!isValid(idSchema, id)) return [];
  const actor = await currentActor();
  const current = await repo.getProbis(id);
  if (!current || !can.read(actor, current.opdId)) return [];
  return repo.getReviews(id);
}

/** Diagram BPMN probis (CMS): dibaca siapa pun yang boleh membaca rekamannya. */
export async function getProbisDiagram(id: string): Promise<ActionResult<repo.ProbisDiagram>> {
  try {
    arg(idSchema, id);
    const actor = await currentActor();
    const current = await repo.getProbis(id);
    if (!current || !can.read(actor, current.opdId)) throw new Error("Probis tidak ditemukan.");
    return { ok: true, data: await repo.getProbisDiagram(id) };
  } catch (error) {
    return fail(error);
  }
}

/** Simpan diagram BPMN; aturan sama dengan menyunting rekamannya (draf/dikembalikan, OPD sendiri). */
export async function saveProbisDiagram(id: string, input: { xml: string; svg: string }): Promise<ActionResult<{ updatedAt: string }>> {
  try {
    arg(idSchema, id);
    const { xml, svg } = arg(diagramInput, input);
    const actor = await currentActor();
    const current = await repo.getProbis(id);
    if (!current || !can.read(actor, current.opdId)) throw new Error("Probis tidak ditemukan.");
    if (!can.edit(actor, current)) throw new Error("Diagram hanya dapat diubah saat probis masih draf atau dikembalikan.");
    const updatedAt = await repo.saveProbisDiagram(id, xml, svg, actor);
    refresh();
    return { ok: true, data: { updatedAt } };
  } catch (error) {
    return fail(error);
  }
}

export async function suggestProbis(input: { name: string; opd: string; note?: string; period?: string }): Promise<ActionResult<ProbisSuggestion>> {
  try {
    await assertAiQuota((await currentActor()).id);
    assertAiInput(input);
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
    await assertImportQuota(actor.id);
    const file = form.get("file");
    assertUploadFile(file, "Pilih berkas .xlsx atau .zip.");
    const upload = readUpload(file.name, new Uint8Array(await file.arrayBuffer()));
    const locked = can.lockedOpd(actor);
    const [lockedOpd, existing, options, resolve] = await Promise.all([
      locked ? repo.opdCodeOf(locked) : null,
      repo.existingCodes(upload.rows.map((r) => r.code).filter((c): c is string => !!c)),
      periods.periodOptions(),
      rabFor(),
    ]);
    return { ok: true, data: { file: upload.file, unsupported: upload.unsupported, rows: validateRows(upload.rows, { existing, lockedOpd, periods: options, rabFor: resolve }) } };
  } catch (error) {
    return fail(error);
  }
}

/** Langkah 2 impor: simpan baris tanpa galat. Validasi diulang di server. */
export async function commitImport(rows: ImportRow[], options: { status: "draft" | "submitted"; update: boolean }): Promise<ActionResult<{ created: number; updated: number; skipped: number }>> {
  try {
    arg(importRows, rows);
    arg(importOptions, options);
    await assertImportQuota((await currentActor()).id);
    const actor = await currentActor();
    if (!can.import(actor)) throw new Error("Peran Anda tidak dapat mengimpor data.");
    const locked = can.lockedOpd(actor);
    const [lockedOpd, existing, periodList, resolve] = await Promise.all([
      locked ? repo.opdCodeOf(locked) : null,
      repo.existingCodes(rows.map((r) => r.code).filter((c): c is string => !!c)),
      periods.periodOptions(),
      rabFor(),
    ]);
    const valid = validateRows(rows, { existing, lockedOpd, periods: periodList, rabFor: resolve }).filter((r) => !r.issues.some((i) => i.level === "error"));
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
    arg(yearSchema, start);
    arg(yearSchema, end);
    await periodAdmin();
    const name = await periods.createPeriod(start, end);
    refresh({ reference: true });
    return { ok: true, data: { name } };
  } catch (error) {
    return fail(error);
  }
}

export async function setActivePeriod(id: string): Promise<ActionResult> {
  try {
    arg(idSchema, id);
    await periodAdmin();
    await periods.setActivePeriod(id);
    refresh({ reference: true });
    return { ok: true, data: undefined };
  } catch (error) {
    return fail(error);
  }
}

export async function deletePeriod(id: string): Promise<ActionResult> {
  try {
    arg(idSchema, id);
    await periodAdmin();
    await periods.deletePeriod(id);
    refresh({ reference: true });
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
    // Infrastruktur, aplikasi, data & layanan contoh dihapus dulu: tautannya ke probis contoh ikut terlepas.
    const removed = (await gapRepo.clearSamples()) + (await rencanaRepo.clearSamples()) + (await keamananRepo.clearSamples()) + (await infraRepo.clearSamples()) + (await aplikasiRepo.clearSamples()) + (await dataRepo.clearSamples()) + (await layananRepo.clearSamples()) + (await repo.clearSamples());
    refresh();
    return { ok: true, data: { removed } };
  } catch (error) {
    return fail(error);
  }
}

/* ---------- Referensi berversi (RAB untuk probis, RAL untuk layanan, RAD untuk data, RAA untuk aplikasi, RAI untuk infrastruktur) ---------- */

const refs = { rab: rabRepo.rab, ral: ralRepo.ral, rad: radRepo.rad, raa: raaRepo.raa, rai: raiRepo.rai } satisfies Record<RefKind, VersionedRef>;

async function refAdmin(kind: RefKind) {
  const actor = await currentActor();
  if (!can.manageReference(actor, kind)) throw new Error(`Hanya pengelola referensi arsitektur yang dapat mengubah ${refs[kind].label}.`);
  return actor;
}

const versionName = z.string("Data tidak valid.").trim().min(3, "Nama versi minimal 3 karakter.").max(120, "Nama versi maksimal 120 karakter.");
const nodePatch = z.object({ code: refCode.optional(), name: refName.optional(), parentId: idSchema.nullable().optional() }).strict();

const run = async <T,>(kind: RefKind, task: (ref: VersionedRef, actor: Awaited<ReturnType<typeof refAdmin>>) => Promise<T>): Promise<ActionResult<T>> => {
  try {
    if (typeof kind !== "string" || !Object.hasOwn(refs, kind)) throw new Error("Jenis referensi tidak dikenal.");
    const actor = await refAdmin(kind);
    const data = await task(refs[kind], actor);
    refresh({ reference: true });
    return { ok: true, data };
  } catch (error) {
    return fail(error);
  }
};

export async function createRefVersion(kind: RefKind, fromId: string, name: string, note?: string) {
  return run(kind, (ref, actor) => ref.createVersion(arg(idSchema, fromId), arg(versionName, name), note == null ? null : arg(noteSchema, note), actor));
}

export async function updateRefNode(kind: RefKind, id: string, patch: { code?: string; name?: string; parentId?: string | null }) {
  return run(kind, (ref, actor) => ref.updateNode(arg(idSchema, id), arg(nodePatch, patch), actor));
}

export async function addRefNode(kind: RefKind, versionId: string, parentId: string | null, code: string, name: string) {
  return run(kind, (ref, actor) => ref.addNode(arg(idSchema, versionId), arg(idSchema.nullable(), parentId), arg(refCode, code), arg(refName, name), actor));
}

export async function deleteRefNode(kind: RefKind, id: string) {
  return run(kind, (ref, actor) => ref.deleteNode(arg(idSchema, id), actor));
}

export async function setRefNodeStatus(kind: RefKind, id: string, status: RabStatus) {
  return run(kind, (ref, actor) => {
    if (status !== "berlaku" && status !== "tidak_berlaku") throw new Error("Status referensi tidak valid.");
    return ref.setNodeStatus(arg(idSchema, id), status, actor);
  });
}

export async function publishRefVersion(kind: RefKind, id: string) {
  return run(kind, (ref, actor) => ref.publishVersion(arg(idSchema, id), actor));
}

export async function deleteRefVersion(kind: RefKind, id: string) {
  return run(kind, (ref) => ref.deleteVersion(arg(idSchema, id)));
}

/** Pakai versi referensi lain untuk satu periode; RAB tiap probis / RAL tiap layanan dipetakan ulang otomatis. */
export async function setPeriodRefVersion(kind: RefKind, periodId: string, versionId: string) {
  return run(kind, (ref, actor) => ref.remapPeriod(arg(idSchema, periodId), arg(idSchema, versionId), actor));
}
