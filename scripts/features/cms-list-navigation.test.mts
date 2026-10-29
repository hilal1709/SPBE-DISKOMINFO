import assert from "node:assert/strict";
import { test } from "node:test";
import { ALL_CMS_PERIODS, cmsListFilters, matchesCmsPeriod, savedListHref } from "@/lib/cms/list-navigation";
import { parseProbisParams, probisParams } from "@/lib/probis/table-params";

const active = "2030–2034";
const oldPeriod = "2025–2029";

for (const domain of ["proses-bisnis", "layanan", "data", "aplikasi", "infrastruktur", "keamanan"]) {
  test(`${domain}: daftar biasa menghitung ajuan ulang dari periode nonaktif`, () => {
    // Kasus audit: ajuan ulang di periode lama, semua data periode aktif sudah disetujui.
    const rows = [
      { id: "existing", period: oldPeriod, status: "submitted", name: "Isi diperbarui" },
      { id: "current", period: active, status: "approved", name: "Data aktif" },
    ];
    const view = domain === "proses-bisnis" ? parseProbisParams({}) : cmsListFilters(new URLSearchParams());
    assert.equal(view.period, ALL_CMS_PERIODS);
    const submitted = rows.filter((row) => matchesCmsPeriod(row.period, view.period) && row.status === "submitted");
    assert.equal(submitted.length, 1);
    assert.equal(submitted[0].id, "existing");
    // Filter periode eksplisit tetap harus dihormati, bukan memalsukan jumlah ajuan periode aktif.
    assert.equal(rows.filter((row) => matchesCmsPeriod(row.period, active) && row.status === "submitted").length, 0);
    assert.equal(rows.filter((row) => matchesCmsPeriod(row.period, oldPeriod) && row.status === "submitted").length, 1);
  });

  test(`${domain}: Lihat daftar setelah ajukan ulang memilih Diajukan dan periode lama`, () => {
    const url = new URL(savedListHref(`/cms/${domain}`, true, oldPeriod, "rejected"), "https://example.test");
    assert.equal(url.pathname, `/cms/${domain}`);
    const view = domain === "proses-bisnis"
      ? parseProbisParams(Object.fromEntries(url.searchParams))
      : cmsListFilters(url.searchParams);
    assert.equal(view.tab, "submitted");
    assert.equal(view.period, oldPeriod);
  });
}

test("data baru yang diajukan dan draf membuka status yang sesuai", () => {
  for (const [submitted, tab] of [[true, "submitted"], [false, "draft"]] as const) {
    const url = new URL(savedListHref("/cms/data", submitted, active), "https://example.test");
    assert.deepEqual(cmsListFilters(url.searchParams), { tab, period: active });
  }
});

test("simpan perubahan tanpa ajukan tetap memakai status rekaman", () => {
  const url = new URL(savedListHref("/cms/data", false, oldPeriod, "rejected"), "https://example.test");
  assert.deepEqual(cmsListFilters(url.searchParams), { tab: "rejected", period: oldPeriod });
});

test("alamat daftar biasa dan filter tidak valid memakai nilai bawaan", () => {
  for (const query of ["", "tab=invalid&periode="]) {
    assert.deepEqual(cmsListFilters(new URLSearchParams(query)), { tab: "all", period: "__all" });
  }
});

test("pergantian URL dibaca kembali, tanpa menyimpan filter navigasi sebelumnya", () => {
  assert.equal(cmsListFilters(new URLSearchParams("tab=rejected")).tab, "rejected");
  assert.deepEqual(cmsListFilters(new URLSearchParams({ tab: "submitted", periode: oldPeriod })), { tab: "submitted", period: oldPeriod });
});

test("Probis: pilihan periode aktif tetap tersimpan di URL ketika bawaan menjadi Semua", () => {
  const view = parseProbisParams({ tab: "submitted", periode: active });
  const params = probisParams(view);
  assert.equal(params.get("periode"), active);
  assert.deepEqual(parseProbisParams(Object.fromEntries(params)), view);
  const all = { ...view, period: ALL_CMS_PERIODS };
  assert.equal(probisParams(all).has("periode"), false);
  assert.deepEqual(parseProbisParams(Object.fromEntries(probisParams(all))), all);
});
