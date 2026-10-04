import { z } from "zod";
import type { RabIndex } from "@/lib/probis/rab-index";
import { geminiJson } from "./gemini";
import { tokens } from "./text";
import { ikuBySasaran, pdByCode, sasaranBySektor, sasaranStrategis } from "@/lib/probis/reference";

export type SuggestInput = { name: string; opd: string; note?: string };
export type ProbisSuggestion = {
  source: "gemini" | "lokal";
  uraian: string;
  sasaran: string;
  iku: string;
  rab: { code: string; reason: string }[];
};

/* ---------- Heuristik lokal (gratis, tanpa API) ---------- */

/** Indeks kata per versi RAB (dibuat sekali per versi). Hanya sub-urusan yang masih berlaku. */
const cache = new WeakMap<RabIndex, ReturnType<typeof buildIndex>>();
function buildIndex(rab: RabIndex) {
  const level3 = rab.level(3, true);
  const entries = level3.map((node) => ({ node, own: new Set(tokens(node.name)), parent: new Set(tokens(rab.byCode.get(node.parent!)?.name ?? "")) }));
  // Bobot IDF: kata yang muncul di banyak sub-urusan (mis. "kelola", "tingkat") hampir tak berarti.
  const df = new Map<string, number>();
  for (const { own } of entries) for (const t of own) df.set(t, (df.get(t) ?? 0) + 1);
  const weight = (t: string) => Math.log((entries.length + 1) / ((df.get(t) ?? 0) + 1));
  return { level3, entries, weight };
}
const indexOf = (rab: RabIndex) => {
  let built = cache.get(rab);
  if (!built) cache.set(rab, (built = buildIndex(rab)));
  return built;
};

function local({ name, opd, note }: SuggestInput, rab: RabIndex): ProbisSuggestion {
  const { level3, entries: index, weight } = indexOf(rab);
  const pd = pdByCode.get(opd);
  const query = tokens(`${name} ${note ?? ""}`);
  const home = new Set(pd?.rab2.map((c) => `RAB.${c}`));
  const sektors = new Set([...home].map((c) => c.slice(0, 6)));

  const ranked = index
    .map(({ node, own, parent }) => {
      const hits = query.filter((t) => own.has(t));
      const parentHits = query.filter((t) => parent.has(t) && !own.has(t));
      const text = hits.reduce((sum, t) => sum + weight(t), 0) + parentHits.reduce((sum, t) => sum + weight(t) * 0.5, 0);
      // Utamakan urusan milik PD; kecocokan kata di sektor lain dianggap lebih lemah.
      const inHome = home.has(node.parent!);
      const inSektor = sektors.has(node.parent!.slice(0, 6));
      const score = text * (inHome ? 1.3 : inSektor ? 1 : 0.6) + (inHome ? 2.5 : 0);
      return { node, score, text, hits: [...new Set([...hits, ...parentHits])] };
    })
    .filter((r) => r.text > 1.2 || r.score >= 2.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  // Tanpa kecocokan kata: tawarkan sub-urusan dari urusan utama PD.
  const picks = ranked.length
    ? ranked.map((r) => ({ code: r.node.code, reason: r.hits.length ? `Cocok dengan kata kunci: ${r.hits.join(", ")}` : "Urusan utama Perangkat Daerah" }))
    : level3.filter((n) => home.has(n.parent!)).slice(0, 3).map((n) => ({ code: n.code, reason: "Urusan utama Perangkat Daerah" }));

  const top = picks[0] ? rab.byCode.get(picks[0].code) : undefined;
  const l2 = top?.parent ? rab.byCode.get(top.parent) : undefined;
  const sektor = l2?.parent?.slice(4) ?? "09";
  const sasaranIndex = sasaranBySektor[sektor]?.[0] ?? 4;
  const object = (l2?.name ?? "urusan pemerintahan").toLowerCase();

  return {
    source: "lokal",
    uraian: `${name} yang diselenggarakan oleh ${pd?.name ?? "Perangkat Daerah"} pada urusan ${object}, meliputi perencanaan, pelaksanaan, pengendalian mutu, serta pelaporan hasil secara berkala.`,
    sasaran: sasaranStrategis[sasaranIndex]!,
    iku: ikuBySasaran[sasaranIndex]!,
    rab: picks,
  };
}

/* ---------- Gemini API (free tier) ---------- */

const geminiResult = z.object({
  uraian: z.string().min(10),
  sasaran: z.string(),
  iku: z.string().min(2),
  rab: z.array(z.object({ code: z.string(), reason: z.string() })).max(5),
});

async function gemini(input: SuggestInput, key: string, rab: RabIndex): Promise<ProbisSuggestion> {
  const { level3 } = indexOf(rab);
  const pd = pdByCode.get(input.opd);
  const prompt = [
    "Anda analis arsitektur SPBE Pemerintah Kabupaten Gresik. Lengkapi isian Domain Proses Bisnis berikut dalam bahasa Indonesia baku.",
    `Nama proses bisnis: ${input.name}`,
    `Perangkat Daerah: ${pd?.name ?? input.opd}`,
    input.note ? `Catatan pengisi: ${input.note}` : "",
    "",
    "Tugas:",
    "1. uraian: 1–2 kalimat deskripsi urusan pemerintahan yang diselenggarakan.",
    "2. sasaran: pilih PERSIS satu kalimat dari daftar SASARAN.",
    "3. iku: indikator kinerja utama yang mengukur sasaran tersebut (singkat).",
    "4. rab: maksimal 3 kode RAB Level 3 paling relevan dari daftar RAB, beserta alasan singkat.",
    "",
    "SASARAN:",
    ...sasaranStrategis.map((s) => `- ${s}`),
    "",
    "RAB LEVEL 3 (kode nama):",
    ...level3.map((n) => `${n.code} ${n.name}`),
  ].join("\n");

  const parsed = geminiResult.parse(
    await geminiJson(key, prompt, {
      type: "OBJECT",
      properties: {
        uraian: { type: "STRING" },
        sasaran: { type: "STRING" },
        iku: { type: "STRING" },
        rab: { type: "ARRAY", items: { type: "OBJECT", properties: { code: { type: "STRING" }, reason: { type: "STRING" } }, required: ["code", "reason"] } },
      },
      required: ["uraian", "sasaran", "iku", "rab"],
    }),
  );

  // Hanya terima kode RAB L3 dan sasaran yang benar-benar ada di referensi.
  const picks = parsed.rab.filter((r) => { const node = rab.byCode.get(r.code); return node?.level === 3 && rab.active(node); }).slice(0, 3);
  const fallback = local(input, rab);
  const sasaran = sasaranStrategis.find((s) => s === parsed.sasaran) ?? fallback.sasaran;
  return { source: "gemini", uraian: parsed.uraian, sasaran, iku: parsed.iku, rab: picks.length ? picks : fallback.rab };
}

/** Saran isian probis untuk versi RAB tertentu: Gemini bila GEMINI_API_KEY tersedia, selain itu (atau bila gagal) heuristik lokal. */
export async function suggestProbis(input: SuggestInput, rab: RabIndex): Promise<ProbisSuggestion> {
  const key = process.env.GEMINI_API_KEY;
  if (key) {
    try {
      return await gemini(input, key, rab);
    } catch (error) {
      console.warn("Saran AI Gemini gagal, memakai heuristik lokal:", error);
    }
  }
  return local(input, rab);
}
