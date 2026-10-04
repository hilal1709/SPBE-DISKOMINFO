import { z } from "zod";
import { toMetode, toTarget } from "@/lib/layanan/import";
import { ekonomiByTarget, kementerianByRal2, manfaatByTarget, RAL_PUBLIK, ralForRab2, risikoMitigasi, targetLabel, type Metode, type Target } from "@/lib/layanan/reference";
import type { RabIndex } from "@/lib/probis/rab-index";
import { pdByCode } from "@/lib/probis/reference";
import { geminiJson } from "./gemini";
import { tokens } from "./text";

export type LayananSuggestInput = { name: string; opd: string; note?: string };
export type LayananSuggestion = {
  source: "gemini" | "lokal";
  tujuan: string;
  fungsi: string;
  ral: { code: string; reason: string }[];
  target: Target;
  /** Hanya bila bisa disimpulkan dari nama/catatan. */
  metode: Metode | null;
  manfaat: string;
  ekonomi: string;
  risiko: string;
  mitigasi: string;
  kl: string | null;
};

const lower = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

/* ---------- Heuristik lokal (gratis, tanpa API) ---------- */

const cache = new WeakMap<RabIndex, ReturnType<typeof buildIndex>>();
function buildIndex(ral: RabIndex) {
  const level3 = ral.level(3, true);
  const entries = level3.map((node) => ({ node, own: new Set(tokens(node.name)), parent: new Set(tokens(ral.byCode.get(node.parent!)?.name ?? "")) }));
  const df = new Map<string, number>();
  for (const { own } of entries) for (const t of own) df.set(t, (df.get(t) ?? 0) + 1);
  const weight = (t: string) => Math.log((entries.length + 1) / ((df.get(t) ?? 0) + 1));
  return { level3, entries, weight };
}
const indexOf = (ral: RabIndex) => {
  let built = cache.get(ral);
  if (!built) cache.set(ral, (built = buildIndex(ral)));
  return built;
};

/** RAL L2 yang menjadi urusan utama PD (dipetakan dari RAB L2 lewat nama). */
function homeRal2(opd: string, ral: RabIndex, rab: RabIndex) {
  const pd = pdByCode.get(opd);
  return new Set((pd?.rab2 ?? []).map((c) => ralForRab2(`RAB.${c}`, rab)).filter((c): c is string => !!c && ral.byCode.has(c)));
}

function local({ name, opd, note }: LayananSuggestInput, ral: RabIndex, rab: RabIndex): LayananSuggestion {
  const { level3, entries, weight } = indexOf(ral);
  const pd = pdByCode.get(opd);
  const query = tokens(`${name} ${note ?? ""}`);
  const home = homeRal2(opd, ral, rab);

  const ranked = entries
    .map(({ node, own, parent }) => {
      const hits = query.filter((t) => own.has(t));
      const parentHits = query.filter((t) => parent.has(t) && !own.has(t));
      const text = hits.reduce((sum, t) => sum + weight(t), 0) + parentHits.reduce((sum, t) => sum + weight(t) * 0.5, 0);
      const inHome = home.has(node.parent!);
      return { node, text, score: text * (inHome ? 1.3 : 0.7) + (inHome ? 2.5 : 0), hits: [...new Set([...hits, ...parentHits])] };
    })
    .filter((r) => r.text > 1.2 || r.score >= 2.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  const picks = ranked.length
    ? ranked.map((r) => ({ code: r.node.code, reason: r.hits.length ? `Cocok dengan kata kunci: ${r.hits.join(", ")}` : "Urusan utama Perangkat Daerah" }))
    : level3.filter((n) => home.has(n.parent!)).slice(0, 3).map((n) => ({ code: n.code, reason: "Urusan utama Perangkat Daerah" }));

  const top = picks[0] ? ral.byCode.get(picks[0].code) : undefined;
  const ral2 = top?.parent ?? null;
  const guessed = toTarget(`${name} ${note ?? ""}`).value;
  // Layanan administrasi pemerintahan (RAL.02) melayani internal pemerintah.
  const target: Target = guessed ?? (ral2 && !ral2.startsWith(RAL_PUBLIK) ? (/pegawai|asn|cuti|pangkat|gaji|pensiun/i.test(name) ? "asn" : "pemerintah") : "masyarakat");
  const metode = note ? toMetode(note).value : null;
  const [risiko, mitigasi] = risikoMitigasi[metode === "tatap_muka" ? 2 : 0]!;
  const object = lower(name.replace(/^layanan\s+/i, ""));

  return {
    source: "lokal",
    tujuan: `Menyelenggarakan ${object} yang cepat, mudah, dan akuntabel bagi ${target === "asn" ? "ASN" : lower(targetLabel[target])}.`,
    fungsi: top ? `Mendukung ${lower(top.name)} pada ${pd?.name ?? "Perangkat Daerah"}.` : `Mendukung penyelenggaraan urusan ${pd?.name ?? "Perangkat Daerah"}.`,
    ral: picks,
    target,
    metode,
    manfaat: manfaatByTarget[target][0]!,
    ekonomi: ekonomiByTarget[target][0]!,
    risiko,
    mitigasi,
    kl: ral2 ? (kementerianByRal2[ral2] ?? null) : null,
  };
}

/* ---------- Gemini API (free tier) ---------- */

const geminiResult = z.object({
  tujuan: z.string().min(10),
  fungsi: z.string().min(5),
  ral: z.array(z.object({ code: z.string(), reason: z.string() })).max(5),
  target: z.enum(["masyarakat", "usaha", "asn", "pemerintah"]),
  metode: z.enum(["elektronik", "hybrid", "tatap_muka", "tidak_diketahui"]),
  manfaat: z.string().min(5),
  ekonomi: z.string().min(5),
  risiko: z.string().min(5),
  mitigasi: z.string().min(5),
});

async function gemini(input: LayananSuggestInput, key: string, ral: RabIndex, rab: RabIndex): Promise<LayananSuggestion> {
  const { level3 } = indexOf(ral);
  const pd = pdByCode.get(input.opd);
  const prompt = [
    "Anda analis arsitektur SPBE Pemerintah Kabupaten Gresik. Lengkapi isian Domain Arsitektur Layanan berikut dalam bahasa Indonesia baku dan singkat.",
    `Nama layanan: ${input.name}`,
    `Perangkat Daerah: ${pd?.name ?? input.opd}`,
    input.note ? `Catatan pengisi: ${input.note}` : "",
    "",
    "Tugas:",
    "1. tujuan: 1 kalimat tujuan layanan.",
    "2. fungsi: 1 kalimat fungsi layanan.",
    "3. ral: maksimal 3 kode RAL Level 3 paling relevan dari daftar RAL, beserta alasan singkat.",
    "4. target: masyarakat | usaha | asn | pemerintah.",
    "5. metode: elektronik | hybrid | tatap_muka, atau tidak_diketahui bila tidak tersirat dari nama/catatan.",
    "6. manfaat, ekonomi: potensi manfaat dan potensi ekonomi (masing-masing 1 kalimat).",
    "7. risiko, mitigasi: satu potensi risiko utama dan mitigasinya.",
    "",
    "RAL LEVEL 3 (kode nama):",
    ...level3.map((n) => `${n.code} ${n.name}`),
  ].join("\n");

  const parsed = geminiResult.parse(
    await geminiJson(key, prompt, {
      type: "OBJECT",
      properties: {
        tujuan: { type: "STRING" },
        fungsi: { type: "STRING" },
        ral: { type: "ARRAY", items: { type: "OBJECT", properties: { code: { type: "STRING" }, reason: { type: "STRING" } }, required: ["code", "reason"] } },
        target: { type: "STRING", enum: ["masyarakat", "usaha", "asn", "pemerintah"] },
        metode: { type: "STRING", enum: ["elektronik", "hybrid", "tatap_muka", "tidak_diketahui"] },
        manfaat: { type: "STRING" },
        ekonomi: { type: "STRING" },
        risiko: { type: "STRING" },
        mitigasi: { type: "STRING" },
      },
      required: ["tujuan", "fungsi", "ral", "target", "metode", "manfaat", "ekonomi", "risiko", "mitigasi"],
    }),
  );

  // Hanya terima kode RAL L3 yang benar-benar ada (dan berlaku) di versi periode.
  const fallback = local(input, ral, rab);
  const picks = parsed.ral.filter((r) => { const node = ral.byCode.get(r.code); return node?.level === 3 && ral.active(node); }).slice(0, 3);
  const top = picks[0] ? ral.byCode.get(picks[0].code) : undefined;
  return {
    ...parsed,
    source: "gemini",
    ral: picks.length ? picks : fallback.ral,
    metode: parsed.metode === "tidak_diketahui" ? null : parsed.metode,
    kl: top?.parent ? (kementerianByRal2[top.parent] ?? null) : fallback.kl,
  };
}

/** Saran isian layanan: Gemini bila GEMINI_API_KEY tersedia, selain itu (atau bila gagal) heuristik lokal. */
export async function suggestLayanan(input: LayananSuggestInput, ral: RabIndex, rab: RabIndex): Promise<LayananSuggestion> {
  const key = process.env.GEMINI_API_KEY;
  if (key) {
    try {
      return await gemini(input, key, ral, rab);
    } catch (error) {
      console.warn("Saran AI Gemini gagal, memakai heuristik lokal:", error);
    }
  }
  return local(input, ral, rab);
}
