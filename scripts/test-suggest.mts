/**
 * Uji saran lokal (tanpa Gemini) terhadap kumpulan nama proses bisnis (B12).
 * Jalankan: pnpm exec tsx scripts/test-suggest.mts
 * Gagal (exit 1) bila saran teratas jatuh ke sektor yang jelas salah.
 */
delete process.env.GEMINI_API_KEY;
const { suggestProbis } = await import("../lib/ai/probis-suggest");
const { sampleRab } = await import("../lib/probis/sample-reference");
const { stems } = await import("../lib/ai/text");

const stemCases: [string, string][] = [["pengelolaan", "kelola"], ["peternakan", "ternak"], ["penyusunan", "susun"], ["perencanaan", "rencana"], ["pelayanan", "layan"], ["penerimaan", "terima"], ["pemantauan", "pantau"]];
let failed = 0;
for (const [word, expected] of stemCases) {
  const got = stems(word);
  const ok = got.includes(expected);
  if (!ok) failed++;
  console.log(`${ok ? "✓" : "✗"} stem ${word} → ${got.join("/")} (harap: ${expected})`);
}

/** [nama, OPD, awalan RAB L3 yang TIDAK boleh muncul sebagai saran teratas] */
const cases: [string, string, RegExp | null][] = [
  ["Pengelolaan Arsip Daerah", "DISPERPUSIP", /^RAB\.02/],
  ["Pengelolaan Arsip Daerah", "", null],
  ["Pelayanan Kenaikan Pangkat Pegawai", "BKPSDM", /^RAB\.02/],
  ["Pengendalian Penyakit Hewan Ternak", "DISTAN", null],
  ["Penerbitan Izin Usaha", "DPMPTSP", null],
  ["Pengelolaan Keuangan Daerah", "BPPKAD", /^RAB\.02/],
];
for (const [name, opd, banned] of cases) {
  const s = await suggestProbis({ name, opd }, sampleRab);
  const top = s.rab[0]?.code ?? "—";
  const bad = !!banned && banned.test(top);
  if (bad) failed++;
  console.log(`${bad ? "✗" : "✓"} ${name} [${opd || "tanpa OPD"}] → ${s.rab.map((r) => `${r.code} ${sampleRab.byCode.get(r.code)?.name} (${r.reason})`).join(" | ") || "tidak ada saran"}`);
}
if (failed) {
  console.error(`${failed} kasus gagal`);
  process.exit(1);
}
