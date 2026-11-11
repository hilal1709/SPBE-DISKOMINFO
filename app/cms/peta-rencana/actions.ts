"use server";
import { assertImportQuota } from "@/lib/security/rate-limit";
import { assertUploadFile } from "@/lib/security/upload";
import { arg, editOptions, idSchema, importRows, isValid, opdCode, periodName, updateOption } from "@/lib/security/schemas";
import { domainKeys, type DomainKey } from "@/lib/domains";
import * as links from "@/lib/peta-rencana/links";
import { z } from "zod";
import { can, currentActor } from "@/lib/access";
import { fail, refresh, type ActionResult } from "@/lib/cms/result";
import * as repo from "@/lib/peta-rencana/cms-repo";
import { parseLinkLines, readUpload, validateRows, type RencanaImportResult, type RencanaImportRow } from "@/lib/peta-rencana/import";
import { statusKeys, type RencanaStatus } from "@/lib/peta-rencana/muatan";
import { indicatorInput, muatanInput, rencanaInput, type RencanaInput } from "@/lib/peta-rencana/schema";
import { assertOpdBerlaku, opdBookSafe } from "@/lib/opd/repo";
import { flagInactivePd, setPdBook } from "@/lib/probis/import";
import * as periods from "@/lib/probis/periods";
import { deleteMuatan, muatanBookSafe, saveMuatan } from "@/lib/peta-rencana/muatan-repo";
import { muatanKeyOf } from "@/lib/peta-rencana/muatan";

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
    if (!(await muatanBookSafe()).keys.includes(parsed.data.muatan)) return { ok: false, error: "Periksa kembali isian yang ditandai.", fields: { muatan: "Muatan tidak ditemukan" } };
    const keep = options.id ? (await repo.getRencana(options.id))?.opdCode : null;
    await assertOpdBerlaku(parsed.data.opd, parsed.data.period, keep);
    const id = options.id ? await repo.updateRencana(options.id, parsed.data, actor) : await repo.createRencana(parsed.data, actor);
    refresh();
    return { ok: true, data: { id } };
  } catch (error) {
    return fail(error);
  }
}

const linkArgs = z.object({ period: periodName, domain: z.enum(domainKeys, "Data tidak valid."), opd: opdCode.nullable() });

/** Pilihan entri arsitektur tervalidasi untuk ditautkan ke kegiatan (formulir Peta Rencana). */
export async function rencanaLinkOptions(period: string, domain: DomainKey, opd: string | null): Promise<ActionResult<{ code: string; name: string; opd: string }[]>> {
  try {
    const args = arg(linkArgs, { period, domain, opd });
    await manager();
    return { ok: true, data: await links.linkOptions(args.period, args.domain, args.opd || null) };
  } catch (error) {
    return fail(error);
  }
}

/** Kegiatan Peta Rencana yang menunjuk satu entri arsitektur (untuk pop-up detail domain di CMS; wajib login). */
export async function relatedRencana(domain: DomainKey, code: string, period: string): Promise<ActionResult<links.RelatedPlan[]>> {
  try {
    const args = arg(z.object({ period: periodName, domain: z.enum(domainKeys, "Data tidak valid."), code: z.string().trim().min(1).max(60) }), { period, domain, code });
    await currentActor();
    return { ok: true, data: await links.relatedPlans(args.domain, args.code, args.period) };
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

async function importContext(rows: { code?: unknown; tautanRaw?: unknown }[]) {
  const actor = await manager();
  const codes = rows.map((r) => r.code).filter((c): c is string => typeof c === "string" && !!c);
  const linkCodes = [...new Set(rows.flatMap((r) => parseLinkLines(typeof r.tautanRaw === "string" ? r.tautanRaw : null).map((l) => l.code)))].slice(0, 20000);
  const [existing, options, found, muatan] = await Promise.all([repo.existingCodes(codes), periods.periodOptions(), links.resolveLinkCodes(linkCodes), muatanBookSafe()]);
  const byKey = new Map<string, DomainKey[]>();
  for (const f of found) byKey.set(`${f.period}|${f.code}`, [...(byKey.get(`${f.period}|${f.code}`) ?? []), f.domain]);
  return { actor, ctx: { existing, periods: options, muatan, linkDomains: (period: string, code: string) => byKey.get(`${period}|${code}`) ?? [] } };
}

/** Langkah 1 impor: baca berkas, validasi baris, kembalikan pratinjau. */
export async function previewRencanaImport(form: FormData): Promise<ActionResult<RencanaImportResult>> {
  try {
    // Izin dicek sebelum berkas dibaca: mengurai .xlsx/.zip itu berat dan tidak boleh dipicu tanpa hak impor.
    await assertImportQuota((await manager()).id);
    const file = form.get("file");
    assertUploadFile(file, "Pilih berkas .xlsx.");
    setPdBook(await opdBookSafe());
    const upload = readUpload(file.name, new Uint8Array(await file.arrayBuffer()));
    const { ctx } = await importContext(upload.rows);
    return { ok: true, data: { file: upload.file, unsupported: upload.unsupported, rows: flagInactivePd(validateRows(upload.rows, ctx)) } };
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
    const { actor, ctx } = await importContext(rows);
    setPdBook(await opdBookSafe());
    const valid = flagInactivePd(validateRows(rows, ctx)).filter((r) => !r.issues.some((i) => i.level === "error"));
    const values = valid.map((r) => ({
      ...rencanaInput.parse({
        opd: r.opd ?? "", period: r.period, year: r.year ?? 0, sasaran: r.sasaran, inisiatif: r.inisiatif ?? undefined, muatan: r.muatan ?? undefined,
        program: r.program ?? undefined, name: r.name, target: r.target ?? undefined, jumlah: r.jumlah, satuan: r.satuan, status: r.status,
        realisasi: r.realisasi ?? undefined, evaluasi: r.evaluasi ?? undefined, source: r.source, sourceRef: r.sourceRef ?? undefined,
        tautan: r.tautan ?? undefined,
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

/** Tambah atau ubah muatan. Kunci muatan baru dibuat dari namanya dan tidak berubah lagi. */
export async function saveMuatanAction(input: unknown): Promise<ActionResult<{ key: string }>> {
  const parsed = muatanInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Periksa kembali isian yang ditandai.", fields: fieldErrors(parsed.error.issues) };
  try {
    await manager();
    const book = await muatanBookSafe();
    const v = parsed.data;
    const key = v.key || muatanKeyOf(v.label);
    if (!key) return { ok: false, error: "Nama muatan tidak valid.", fields: { label: "Gunakan huruf atau angka" } };
    if (!v.key && book.keys.includes(key)) return { ok: false, error: "Muatan sudah ada.", fields: { label: "Nama sudah dipakai" } };
    if (book.list.some((m) => m.key !== key && (m.abbr === v.abbr || m.label.toLowerCase() === v.label.toLowerCase()))) {
      const abbrClash = book.list.some((m) => m.key !== key && m.abbr === v.abbr);
      return { ok: false, error: abbrClash ? "Singkatan sudah dipakai muatan lain." : "Nama sudah dipakai muatan lain.", fields: abbrClash ? { abbr: "Singkatan sudah dipakai" } : { label: "Nama sudah dipakai" } };
    }
    await saveMuatan({ ...v, key: v.key || undefined }, key);
    refresh({ reference: true });
    return { ok: true, data: { key } };
  } catch (error) {
    return fail(error);
  }
}

/** Hapus muatan; hanya bila tidak dipakai kegiatan mana pun. */
export async function deleteMuatanAction(key: string): Promise<ActionResult> {
  try {
    arg(z.string().trim().min(1).max(60), key);
    await manager();
    await deleteMuatan(key);
    refresh({ reference: true });
    return { ok: true, data: undefined };
  } catch (error) {
    return fail(error);
  }
}
