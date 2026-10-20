import { z } from "zod";
import { toBasis } from "@/lib/aplikasi/import";
import { instansiPusat, isRaaLeaf, type Basis } from "@/lib/aplikasi/reference";
import type { RabIndex } from "@/lib/probis/rab-index";
import { pdByCode } from "@/lib/probis/reference";
import { geminiJson } from "./gemini";
import { tokens } from "./text";

/** Kandidat dependensi pada periode isian (kode, nama, OPD pemilik). */
export type Candidate = { code: string; name: string; opd: string };
export type AplikasiSuggestInput = { name: string; opd: string; pengembang?: string; note?: string };
export type AplikasiSuggestion = {
  source: "gemini" | "lokal";
  uraian: string;
  fungsi: string;
  luaran: string;
  /** RAA terdalam (L3, atau L2 tanpa turunan). */
  raa: { code: string; reason: string }[];
  /** Hanya bila bisa disimpulkan dari nama/catatan. */
  basis: Basis | null;
  /** Proses bisnis tervalidasi yang paling selaras (aplikasi wajib selaras probis). */
  probis: { code: string; reason: string }[];
  layanan: { code: string; reason: string }[];
  customer: string | null;
};

const lower = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

/* ---------- Heuristik lokal (gratis, tanpa API) ---------- */

const PUBLIK = /layanan|izin|perizinan|pengaduan|aduan|online|masyarakat|publik|warga|pendaftaran|antrean|informasi|portal|bantuan|pasien|siswa/i;
const ADMIN = /pegawai|kepegawaian|keuangan|anggaran|arsip|surat|naskah|kinerja|perencanaan|aset|barang|pengadaan|gaji|presensi|absensi|disposisi|internal|e-?office/i;

/** Rangking kandidat berdasarkan kata kunci yang sama; milik unit operasional sedikit diutamakan. */
function rank(text: string, opd: string, list: Candidate[], max: number) {
  const query = new Set(tokens(text));
  return list
    .map((c) => {
      const hits = [...new Set(tokens(c.name).filter((t) => query.has(t)))];
      return { c, hits, score: hits.length + (hits.length && c.opd === opd ? 0.5 : 0) };
    })
    .filter((r) => r.hits.length)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((r) => ({ code: r.c.code, reason: `Cocok dengan kata kunci: ${r.hits.join(", ")}` }));
}

function local(input: AplikasiSuggestInput, raa: RabIndex, deps: { probis: Candidate[]; layanan: Candidate[] }): AplikasiSuggestion {
  const pd = pdByCode.get(input.opd);
  const text = `${input.name} ${input.note ?? ""}`;
  const publik = PUBLIK.test(text) && !ADMIN.test(input.name);
  // Aplikasi Umum: dipakai lintas instansi (dari K/L); selain itu Aplikasi Khusus sesuai urusan PD.
  const umum = !!input.pengembang && instansiPusat.includes(input.pengembang);
  const wanted = umum ? (publik ? "RAA.01.01" : "RAA.01.02") : publik ? "RAA.02.01" : "RAA.02.02";
  const leaves = raa.nodes.filter((n) => raa.active(n) && isRaaLeaf(raa, n.code));
  const first = leaves.find((n) => n.code === wanted || n.parent === wanted);
  const others = leaves.filter((n) => n !== first && n.code.startsWith(wanted.slice(0, 6))).slice(0, 1);
  const reason = `${umum ? "Dikembangkan instansi pusat untuk dipakai lintas daerah" : "Aplikasi spesifik urusan Perangkat Daerah"}, ${publik ? "melayani publik" : "mendukung administrasi"}`;

  const probis = rank(text, input.opd, deps.probis, 3);
  const own = deps.probis.filter((p) => p.opd === input.opd);
  const object = lower(input.name.replace(/^(aplikasi|sistem informasi|si)\s+/i, ""));
  return {
    source: "lokal",
    uraian: `Aplikasi ${object} yang dikelola ${pd?.name ?? "Perangkat Daerah"}.`,
    fungsi: publik ? `Menerima, memproses, dan memantau ${object} secara elektronik.` : `Mencatat, mengolah, dan melaporkan ${object} untuk mendukung tugas ${pd?.name ?? "Perangkat Daerah"}.`,
    luaran: publik ? `Dokumen dan status layanan ${object}` : `Laporan dan rekap ${object}`,
    raa: [...(first ? [{ code: first.code, reason }] : []), ...others.map((n) => ({ code: n.code, reason: "Alternatif dalam kelompok yang sama" }))],
    basis: toBasis(text).value === "mobile" || /android|mobile|apk/i.test(text) ? "mobile" : /web|online|portal/i.test(text) ? "web" : null,
    probis: probis.length ? probis : own.slice(0, 1).map((p) => ({ code: p.code, reason: "Proses bisnis tervalidasi unit operasional" })),
    layanan: rank(text, input.opd, deps.layanan, 2),
    customer: publik ? "Masyarakat" : "Perangkat Daerah",
  };
}

/* ---------- Gemini API (free tier) ---------- */

const geminiResult = z.object({
  uraian: z.string().min(10),
  fungsi: z.string().min(10),
  luaran: z.string().min(3),
  raa: z.array(z.object({ code: z.string(), reason: z.string() })).max(5),
  basis: z.enum(["web", "desktop", "mobile", "cloud", "tidak_diketahui"]),
  probis: z.array(z.object({ code: z.string(), reason: z.string() })).max(5),
  layanan: z.array(z.object({ code: z.string(), reason: z.string() })).max(5),
  customer: z.string(),
});

async function gemini(input: AplikasiSuggestInput, key: string, raa: RabIndex, deps: { probis: Candidate[]; layanan: Candidate[] }): Promise<AplikasiSuggestion> {
  const leaves = raa.nodes.filter((n) => raa.active(n) && isRaaLeaf(raa, n.code));
  const pd = pdByCode.get(input.opd);
  // Batasi kandidat agar prompt tetap ringkas: milik unit operasional dulu.
  const shortlist = (list: Candidate[]) => [...list.filter((c) => c.opd === input.opd), ...list.filter((c) => c.opd !== input.opd)].slice(0, 150);
  const prompt = [
    "Anda analis arsitektur SPBE Pemerintah Kabupaten Gresik. Lengkapi isian Domain Arsitektur Aplikasi berikut dalam bahasa Indonesia baku dan singkat.",
    `Nama aplikasi: ${input.name}`,
    `Unit operasional teknologi: ${pd?.name ?? input.opd}`,
    input.pengembang ? `Unit pengembang: ${pdByCode.get(input.pengembang)?.name ?? input.pengembang}` : "",
    input.note ? `Catatan pengisi: ${input.note}` : "",
    "",
    "Tugas:",
    "1. uraian: 1 kalimat definisi aplikasi.",
    "2. fungsi: 1–2 kalimat fungsi utama.",
    "3. luaran: hasil yang diperoleh dari aplikasi (frasa singkat).",
    "4. raa: maksimal 2 kode RAA paling relevan dari daftar RAA (Aplikasi Umum = dipakai lintas instansi/nasional; Aplikasi Khusus = spesifik urusan).",
    "5. basis: web | desktop | mobile | cloud, atau tidak_diketahui.",
    "6. probis: maksimal 3 kode proses bisnis paling selaras dari daftar proses bisnis (wajib minimal satu bila ada yang relevan).",
    "7. layanan: maksimal 2 kode layanan yang didukung dari daftar layanan (boleh kosong).",
    "8. customer: pengguna data/aplikasi (mis. Masyarakat, ASN, Perangkat Daerah).",
    "",
    "RAA (kode nama):",
    ...leaves.map((n) => `${n.code} ${n.name}`),
    "",
    "Proses bisnis tervalidasi (kode nama):",
    ...shortlist(deps.probis).map((p) => `${p.code} ${p.name}`),
    "",
    "Layanan (kode nama):",
    ...shortlist(deps.layanan).map((p) => `${p.code} ${p.name}`),
  ].join("\n");

  const pickList = { type: "ARRAY", items: { type: "OBJECT", properties: { code: { type: "STRING" }, reason: { type: "STRING" } }, required: ["code", "reason"] } };
  const parsed = geminiResult.parse(
    await geminiJson(key, prompt, {
      type: "OBJECT",
      properties: {
        uraian: { type: "STRING" },
        fungsi: { type: "STRING" },
        luaran: { type: "STRING" },
        raa: pickList,
        basis: { type: "STRING", enum: ["web", "desktop", "mobile", "cloud", "tidak_diketahui"] },
        probis: pickList,
        layanan: pickList,
        customer: { type: "STRING" },
      },
      required: ["uraian", "fungsi", "luaran", "raa", "basis", "probis", "layanan", "customer"],
    }),
  );

  // Hanya terima kode yang benar-benar ada (RAA berlaku di versi periode; probis/layanan dari kandidat).
  const fallback = local(input, raa, deps);
  const known = (list: Candidate[]) => new Set(list.map((c) => c.code));
  const probisCodes = known(deps.probis);
  const layananCodes = known(deps.layanan);
  const raaPicks = parsed.raa.filter((r) => isRaaLeaf(raa, r.code) && raa.active(raa.byCode.get(r.code))).slice(0, 2);
  const probisPicks = parsed.probis.filter((p) => probisCodes.has(p.code)).slice(0, 3);
  return {
    source: "gemini",
    uraian: parsed.uraian,
    fungsi: parsed.fungsi,
    luaran: parsed.luaran,
    raa: raaPicks.length ? raaPicks : fallback.raa,
    basis: parsed.basis === "tidak_diketahui" ? null : parsed.basis,
    probis: probisPicks.length ? probisPicks : fallback.probis,
    layanan: parsed.layanan.filter((l) => layananCodes.has(l.code)).slice(0, 2),
    customer: parsed.customer || fallback.customer,
  };
}

/** Saran isian aplikasi: Gemini bila GEMINI_API_KEY tersedia, selain itu (atau bila gagal) heuristik lokal. */
export async function suggestAplikasi(input: AplikasiSuggestInput, raa: RabIndex, deps: { probis: Candidate[]; layanan: Candidate[] }): Promise<AplikasiSuggestion> {
  const key = process.env.GEMINI_API_KEY;
  if (key) {
    try {
      return await gemini(input, key, raa, deps);
    } catch (error) {
      console.warn("Saran AI Gemini gagal, memakai heuristik lokal:", error);
    }
  }
  return local(input, raa, deps);
}
