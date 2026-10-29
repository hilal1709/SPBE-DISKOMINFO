// Uji unit kontrol keamanan tanpa database: keputusan review, guard impor/sunting, batas unggahan, isian AI.
// Jalankan: pnpm exec tsx scripts/security/guards.test.mts
import assert from "node:assert/strict";
import { test } from "node:test";
import { zipSync } from "fflate";
import { assertImportUpdate, assertStillEditable, importStatus, importUpdateStatus } from "@/lib/cms/guards";
import { defaultsFor, reviewTarget, type Actor } from "@/lib/permissions";
import { assertAiInput } from "@/lib/security/rate-limit";
import { arg, idSchema, importOptions, importRows, reviewArgs, roleKey, saveOptions, yearSchema } from "@/lib/security/schemas";
import { sessionHash } from "@/lib/security/session";
import { MAX_UPLOAD_BYTES, assertUploadFile, readWorkbook, unzipSafe, uploadBudget } from "@/lib/security/upload";

const actor = (role: "operator_opd" | "superadmin", opdId: string | null = "opd-a"): Actor =>
  ({ id: "u", name: "Uji", role, roleName: role, opdId, demo: false, perms: defaultsFor(role) });

test("keputusan review tak dikenal ditolak, bukan dianggap setujui", () => {
  assert.equal(reviewTarget("verify", "verifikasi"), "verified");
  assert.equal(reviewTarget("validate", "validasi"), "approved");
  assert.equal(reviewTarget("reject", "verifikasi"), "rejected");
  assert.throws(() => reviewTarget("x", "verifikasi"));
  assert.throws(() => reviewTarget("validate", "verifikasi"));
  assert.throws(() => reviewTarget("verify", "validasi"));
});

test("status impor hanya draf/diajukan", () => {
  assert.equal(importStatus("draft"), "draft");
  assert.equal(importStatus("submitted"), "submitted");
  for (const s of ["approved", "verified", "rejected", undefined, 1]) assert.throws(() => importStatus(s));
});

test("langsung ajukan pada impor juga mengajukan data lama dan data yang dikembalikan", () => {
  for (const current of ["draft", "rejected", "submitted", "verified", "approved"] as const) {
    assert.equal(importUpdateStatus(current, "submitted"), "submitted");
    assert.equal(importUpdateStatus(current, "draft"), current);
  }
  assert.throws(() => importUpdateStatus("draft", "approved"));
});

test("impor tidak boleh menimpa rekaman OPD lain atau yang sedang ditinjau", () => {
  const op = actor("operator_opd");
  assert.doesNotThrow(() => assertImportUpdate(op, { code: "A", status: "draft", opd_id: "opd-a" }));
  assert.throws(() => assertImportUpdate(op, { code: "A", status: "draft", opd_id: "opd-b" }));
  assert.throws(() => assertImportUpdate(op, { code: "A", status: "approved", opd_id: "opd-a" }));
  assert.doesNotThrow(() => assertImportUpdate(actor("superadmin", null), { code: "A", status: "approved", opd_id: "opd-b" }));
});

test("sunting dicek ulang di transaksi", () => {
  assert.doesNotThrow(() => assertStillEditable(actor("operator_opd"), "rejected"));
  assert.throws(() => assertStillEditable(actor("operator_opd"), "approved"));
});

test("budget zip dibagi semua tingkat", () => {
  const blob = new Uint8Array(30 * 1024 * 1024); // 30 MB nol: terkompresi jadi sangat kecil
  const inner = zipSync({ "a.bin": blob });
  const outer = zipSync({ "1.zip": inner, "2.zip": inner, "3.zip": inner, "4.zip": inner });
  const budget = uploadBudget();
  assert.throws(() => {
    for (const [path, bytes] of Object.entries(unzipSafe(outer, "", budget))) unzipSafe(bytes, path, budget);
  }, /terlalu besar/);
  assert.throws(() => readWorkbook(new TextEncoder().encode("bukan zip")));
});

test("isian AI dibatasi", () => {
  assert.doesNotThrow(() => assertAiInput({ name: "Aplikasi", note: "x".repeat(2000), opd: "DISKOMINFO" }));
  assert.throws(() => assertAiInput({ name: "x".repeat(201) }));
  assert.throws(() => assertAiInput({ name: "ok", note: "x".repeat(2001) }));
  assert.throws(() => assertAiInput({ name: ["array"] }));
  assert.throws(() => assertAiInput(undefined));
});

test("argumen server action divalidasi sebelum ke database", () => {
  const id = "3f2b8c1e-9d4a-4e6b-8a7c-1b2c3d4e5f60";
  assert.equal(arg(idSchema, id), id);
  for (const bad of ["1 or 1=1", "", null, 42, `${id}'--`]) assert.throws(() => arg(idSchema, bad), /Data tidak valid/);
  assert.throws(() => arg(reviewArgs, { id, decision: "approve" }));
  assert.throws(() => arg(reviewArgs, { id, decision: "reject", note: "x".repeat(1001) }), /1\.000/);
  assert.deepEqual(arg(reviewArgs, { id, decision: "reject", note: "  alasan  " }), { id, decision: "reject", note: "alasan" });
  assert.throws(() => arg(importOptions, { status: "approved", update: false }));
  assert.throws(() => arg(saveOptions, { submit: "true" }));
  assert.throws(() => arg(importRows, Array.from({ length: 5001 }, () => ({}))), /5\.000/);
  assert.throws(() => arg(yearSchema, 1999.5));
  assert.equal(arg(roleKey, "kustom_auditor_2"), "kustom_auditor_2");
  assert.throws(() => arg(roleKey, "superadmin' or '1"));
});

test("unggahan di atas 12 MB ditolak sebelum dibaca", () => {
  assert.throws(() => assertUploadFile(null, "Pilih berkas"), /Pilih berkas/);
  assert.throws(() => assertUploadFile(new File([new Uint8Array(MAX_UPLOAD_BYTES + 1)], "a.xlsx"), "x"), /12 MB/);
  assert.doesNotThrow(() => assertUploadFile(new File([new Uint8Array(10)], "a.xlsx"), "x"));
});

test("hash id sesi deterministik dan tidak sama dengan id aslinya", () => {
  const sid = "abc";
  assert.equal(sessionHash(sid), sessionHash(sid));
  assert.match(sessionHash(sid), /^[a-f0-9]{64}$/);
  assert.notEqual(sessionHash(sid), sid);
});
