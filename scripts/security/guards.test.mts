// Uji unit kontrol keamanan tanpa database: keputusan review, guard impor/sunting, batas unggahan, isian AI.
// Jalankan: pnpm exec tsx scripts/security/guards.test.mts
import assert from "node:assert/strict";
import { test } from "node:test";
import { zipSync } from "fflate";
import { assertImportUpdate, assertStillEditable, importStatus } from "@/lib/cms/guards";
import { defaultsFor, reviewTarget, type Actor } from "@/lib/permissions";
import { assertAiInput } from "@/lib/security/rate-limit";
import { readWorkbook, unzipSafe, uploadBudget } from "@/lib/security/upload";

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
