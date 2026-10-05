import { z } from "zod";
import { toJenis, toSifat, toValiditas } from "@/lib/data/import";
import { isRadLeaf, validitasOptions, type Jenis, type Sifat } from "@/lib/data/reference";
import type { RabIndex, RabNode } from "@/lib/probis/rab-index";
import { pdByCode } from "@/lib/probis/reference";
import { geminiJson } from "./gemini";
import { tokens } from "./text";

export type DataSuggestInput = { name: string; opd: string; note?: string };
export type DataSuggestion = {
  source: "gemini" | "lokal";
  uraian: string;
  tujuan: string;
  /** RAD terdalam (L3, atau L2 tanpa turunan). */
  rad: { code: string; reason: string }[];
  sifat: Sifat;
  jenis: Jenis;
  validitas: string;
  /** Hanya bila bisa disimpulkan dari nama/catatan. */
  interoperabel: boolean | null;
};

const lower = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);
const bare = (name: string) => name.replace(/^data\s+/i, "").toLowerCase();

/* ---------- Heuristik lokal (gratis, tanpa API) ---------- */

const cache = new WeakMap<RabIndex, ReturnType<typeof buildIndex>>();
function buildIndex(rad: RabIndex) {
  const leaves = rad.nodes.filter((n) => rad.active(n) && isRadLeaf(rad, n.code));
  const entries = leaves.map((node) => ({ node, own: new Set(tokens(node.name)), parent: new Set(tokens(rad.byCode.get(node.parent ?? "")?.name ?? "")) }));
  const df = new Map<string, number>();
  for (const { own } of entries) for (const t of own) df.set(t, (df.get(t) ?? 0) + 1);
  const weight = (t: string) => Math.log((entries.length + 1) / ((df.get(t) ?? 0) + 1));
  return { leaves, entries, weight };
}
const indexOf = (rad: RabIndex) => {
  let built = cache.get(rad);
  if (!built) cache.set(rad, (built = buildIndex(rad)));
  return built;
};

/** RAD L2 yang namanya sama dengan urusan utama PD (RAB L2). */
function homeRad2(opd: string, rad: RabIndex, rab: RabIndex) {
  const names = new Set((pdByCode.get(opd)?.rab2 ?? []).map((c) => rab.byCode.get(`RAB.${c}`)?.name.toLowerCase()).filter(Boolean));
  return new Set(rad.level(2).filter((n) => names.has(bare(n.name))).map((n) => n.code));
}
const rad2Of = (node: RabNode) => (node.level === 3 ? node.parent! : node.code);

function local({ name, opd, note }: DataSuggestInput, rad: RabIndex, rab: RabIndex): DataSuggestion {
  const { leaves, entries, weight } = indexOf(rad);
  const pd = pdByCode.get(opd);
  const text = `${name} ${note ?? ""}`;
  const query = tokens(text);
  const home = homeRad2(opd, rad, rab);

  const ranked = entries
    .map(({ node, own, parent }) => {
      const hits = query.filter((t) => own.has(t));
      const parentHits = query.filter((t) => parent.has(t) && !own.has(t));
      const score = hits.reduce((sum, t) => sum + weight(t), 0) + parentHits.reduce((sum, t) => sum + weight(t) * 0.5, 0);
      const inHome = home.has(rad2Of(node));
      return { node, text: score, score: score * (inHome ? 1.3 : 0.7) + (inHome ? 2.5 : 0), hits: [...new Set([...hits, ...parentHits])] };
    })
    .filter((r) => r.text > 1.2 || r.score >= 2.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  const picks = ranked.length
    ? ranked.map((r) => ({ code: r.node.code, reason: r.hits.length ? `Cocok dengan kata kunci: ${r.hits.join(", ")}` : "Urusan utama Perangkat Daerah" }))
    : leaves.filter((n) => home.has(rad2Of(n))).slice(0, 3).map((n) => ({ code: n.code, reason: "Urusan utama Perangkat Daerah" }));

  const object = lower(name.replace(/^data\s+/i, ""));
  const keuangan = /anggaran|keuangan|pajak|retribusi|gaji|hibah|belanja|pendapatan/i.test(text);
  const pribadi = /pegawai|pasien|penduduk|nik|pribadi|rekam|kesehatan|penerima/i.test(text);
  return {
    source: "lokal",
    uraian: `Kumpulan data ${object} yang dihimpun dan dikelola ${pd?.name ?? "Perangkat Daerah"}.`,
    tujuan: `Mendukung perencanaan, pemantauan, dan pelaporan ${object} berbasis data.`,
    rad: picks,
    sifat: toSifat(note ?? null).value ?? (keuangan || pribadi ? "terbatas" : "terbuka"),
    jenis: keuangan ? "keuangan" : (toJenis(text).value ?? "statistik"),
    validitas: note ? (toValiditas(note).value ?? "Tahunan") : /harian|presensi|antrean|realtime/i.test(name) ? "Realtime" : "Tahunan",
    interoperabel: /terintegrasi|interoperab|api|satu data|splp/i.test(text) ? true : null,
  };
}

/* ---------- Gemini API (free tier) ---------- */

const geminiResult = z.object({
  uraian: z.string().min(10),
  tujuan: z.string().min(10),
  rad: z.array(z.object({ code: z.string(), reason: z.string() })).max(5),
  sifat: z.enum(["terbuka", "terbatas", "tertutup"]),
  jenis: z.enum(["statistik", "geopasial", "keuangan", "lainnya"]),
  validitas: z.string(),
  interoperabel: z.enum(["ya", "tidak", "tidak_diketahui"]),
});

async function gemini(input: DataSuggestInput, key: string, rad: RabIndex, rab: RabIndex): Promise<DataSuggestion> {
  const { leaves } = indexOf(rad);
  const pd = pdByCode.get(input.opd);
  const prompt = [
    "Anda analis arsitektur SPBE Pemerintah Kabupaten Gresik. Lengkapi isian Domain Arsitektur Data dan Informasi berikut dalam bahasa Indonesia baku dan singkat.",
    `Nama data: ${input.name}`,
    `Perangkat Daerah wali data: ${pd?.name ?? input.opd}`,
    input.note ? `Catatan pengisi: ${input.note}` : "",
    "",
    "Tugas:",
    "1. uraian: 1 kalimat uraian data.",
    "2. tujuan: 1 kalimat tujuan data.",
    "3. rad: maksimal 3 kode RAD paling relevan dari daftar RAD, beserta alasan singkat.",
    "4. sifat: terbuka | terbatas | tertutup (data pribadi/rahasia tidak terbuka).",
    "5. jenis: statistik | geopasial | keuangan | lainnya.",
    `6. validitas: frekuensi pemutakhiran, salah satu dari: ${validitasOptions.join(", ")}.`,
    "7. interoperabel: ya | tidak, atau tidak_diketahui bila tidak tersirat.",
    "",
    "RAD (kode nama):",
    ...leaves.map((n) => `${n.code} ${n.name}`),
  ].join("\n");

  const parsed = geminiResult.parse(
    await geminiJson(key, prompt, {
      type: "OBJECT",
      properties: {
        uraian: { type: "STRING" },
        tujuan: { type: "STRING" },
        rad: { type: "ARRAY", items: { type: "OBJECT", properties: { code: { type: "STRING" }, reason: { type: "STRING" } }, required: ["code", "reason"] } },
        sifat: { type: "STRING", enum: ["terbuka", "terbatas", "tertutup"] },
        jenis: { type: "STRING", enum: ["statistik", "geopasial", "keuangan", "lainnya"] },
        validitas: { type: "STRING", enum: validitasOptions },
        interoperabel: { type: "STRING", enum: ["ya", "tidak", "tidak_diketahui"] },
      },
      required: ["uraian", "tujuan", "rad", "sifat", "jenis", "validitas", "interoperabel"],
    }),
  );

  // Hanya terima kode RAD yang benar-benar ada (dan berlaku) di versi periode.
  const picks = parsed.rad.filter((r) => isRadLeaf(rad, r.code) && rad.active(rad.byCode.get(r.code))).slice(0, 3);
  return {
    ...parsed,
    source: "gemini",
    rad: picks.length ? picks : local(input, rad, rab).rad,
    validitas: toValiditas(parsed.validitas).value ?? "Lainnya",
    interoperabel: parsed.interoperabel === "tidak_diketahui" ? null : parsed.interoperabel === "ya",
  };
}

/** Saran isian data: Gemini bila GEMINI_API_KEY tersedia, selain itu (atau bila gagal) heuristik lokal. */
export async function suggestData(input: DataSuggestInput, rad: RabIndex, rab: RabIndex): Promise<DataSuggestion> {
  const key = process.env.GEMINI_API_KEY;
  if (key) {
    try {
      return await gemini(input, key, rad, rab);
    } catch (error) {
      console.warn("Saran AI Gemini gagal, memakai heuristik lokal:", error);
    }
  }
  return local(input, rad, rab);
}
