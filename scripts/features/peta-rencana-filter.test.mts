import assert from "node:assert/strict";
import { test } from "node:test";
import { emptyFilter, filterFromParams, filterRencana, filterToParams, withRencanaStatus } from "@/lib/peta-rencana/query";
import type { Rencana } from "@/lib/types";

const period = "2025–2029";
const sasaran = ["Sasaran A"];
const filter = { ...emptyFilter(period), tahun: ["2026"], pd: ["DISKOMINFO"], muatan: ["aplikasi"], sasaran };

test("kartu status memilih satu status dan mempertahankan filter lain tanpa mutasi", () => {
  const before = JSON.stringify(filter);
  const next = withRencanaStatus(filter, "berjalan");
  assert.deepEqual(next, { ...filter, status: ["berjalan"] });
  assert.equal(JSON.stringify(filter), before);
  assert.deepEqual(filterFromParams(filterToParams(next, period, sasaran), period, sasaran), next);
});

test("klik ulang melepas status; klik kartu lain mengganti status, bukan menggabungkannya", () => {
  const first = withRencanaStatus(filter, "terlaksana");
  assert.deepEqual(withRencanaStatus(first, "terlaksana"), filter);
  assert.deepEqual(withRencanaStatus(first, "ditunda"), { ...filter, status: ["ditunda"] });
  assert.deepEqual(withRencanaStatus({ ...filter, status: ["berjalan", "ditunda"] }, "berjalan"), { ...filter, status: ["berjalan"] });
});

test("status memfilter katalog, hitungan kartu tetap meliputi semua status dalam cakupan lain", () => {
  const rows = [
    { id: "done", period, year: 2026, opd: "DISKOMINFO", muatan: "aplikasi", sasaran: sasaran[0], status: "terlaksana" },
    { id: "running", period, year: 2026, opd: "DISKOMINFO", muatan: "aplikasi", sasaran: sasaran[0], status: "berjalan" },
    { id: "other-opd", period, year: 2026, opd: "DINSOS", muatan: "aplikasi", sasaran: sasaran[0], status: "terlaksana" },
    { id: "other-year", period, year: 2027, opd: "DISKOMINFO", muatan: "aplikasi", sasaran: sasaran[0], status: "terlaksana" },
  ] as Rencana[];
  const selected = withRencanaStatus(filter, "terlaksana");
  assert.deepEqual(filterRencana(rows, selected).map((r) => r.id), ["done"]);
  assert.deepEqual(filterRencana(rows, selected, { except: "status" }).map((r) => r.id), ["done", "running"]);
  assert.deepEqual(filterRencana(rows, withRencanaStatus(selected, "ditunda")), []);
  assert.equal(filterRencana(rows, { ...selected, status: [] }).length, 2);
});
