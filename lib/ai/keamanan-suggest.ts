import { z } from "zod";
import { kegiatanConfig, kegiatanFromName, kegiatanKeys, type Kegiatan } from "@/lib/keamanan/jenis";
import { pdByCode } from "@/lib/probis/reference";
import { geminiJson } from "./gemini";

export type KeamananSuggestInput = { name: string; opd: string; jenis?: Kegiatan | null; note?: string };
export type KeamananSuggestion = { source: "gemini" | "lokal"; jenis: Kegiatan; deskripsi: string; atribut: Record<string, string> };

/* ---------- Heuristik lokal (gratis, tanpa API) ---------- */

const guesses: [RegExp, Kegiatan][] = [
  [/sop|standar|pedoman|kebijakan|perbup|peraturan|prosedur/i, "standar"],
  [/sosialisasi|bimtek|pelatihan|edukasi|kesadaran|simulasi phishing|awareness/i, "edukasi"],
  [/vulnerab|kerentanan|penetration|pentest|pemindaian|scan/i, "kerentanan"],
  [/insiden|serangan|ddos|defacement|kebocoran|malware|ransomware|peretasan/i, "insiden"],
  [/audit|indeks kami|penilaian mandiri|asesmen/i, "audit"],
  [/kelaikan|sertifikasi|uji laik/i, "kelaikan"],
  [/pemasangan|penerapan|pembaruan|peningkatan|hardening|2fa|dua faktor|enkripsi|sertifikat elektronik/i, "peningkatan"],
];

function local(input: KeamananSuggestInput): KeamananSuggestion {
  const text = `${input.name} ${input.note ?? ""}`;
  const jenis = input.jenis ?? kegiatanFromName(text) ?? guesses.find(([re]) => re.test(text))?.[1] ?? "peningkatan";
  const cfg = kegiatanConfig[jenis];
  const pd = pdByCode.get(input.opd)?.name ?? "Perangkat Daerah";
  const atribut = Object.fromEntries(
    cfg.attrs
      .filter((a) => a.type === "select")
      .map((a) => [a.key, a.options!.find((o) => new RegExp(o.split(/[\s(]/)[0]!, "i").test(text))])
      .filter((e): e is [string, string] => !!e[1]),
  );
  return { source: "lokal", jenis, deskripsi: `Kegiatan ${cfg.short.toLowerCase()} ${input.name} yang dilaksanakan ${pd} untuk memperkuat keamanan SPBE.`, atribut };
}

/* ---------- Gemini ---------- */

const geminiResult = z.object({
  jenis: z.enum(kegiatanKeys),
  deskripsi: z.string(),
  atribut: z.array(z.object({ key: z.string(), value: z.string() })).max(6),
});

async function gemini(input: KeamananSuggestInput, key: string): Promise<KeamananSuggestion> {
  const prompt = [
    "Anda analis arsitektur SPBE Pemerintah Kabupaten Gresik. Lengkapi isian Domain Arsitektur Keamanan berikut dalam bahasa Indonesia baku dan singkat.",
    `Nama kegiatan: ${input.name}`,
    `Instansi: ${pdByCode.get(input.opd)?.name ?? input.opd}`,
    input.jenis ? `Jenis kegiatan: ${kegiatanConfig[input.jenis].label}` : "",
    input.note ? `Catatan pengisi: ${input.note}` : "",
    "",
    "Tugas:",
    `1. jenis: ${input.jenis ? `tetap ${input.jenis}` : `salah satu dari ${kegiatanKeys.join(", ")}`}.`,
    "2. deskripsi: 1 kalimat deskripsi kegiatan.",
    "3. atribut: pasangan key/value kolom khusus yang bisa disimpulkan (jangan mengarang tanggal, hasil audit, atau nilai).",
    "",
    "Kolom khusus per jenis (key: pilihan):",
    ...kegiatanKeys.map((k) => `${k}: ${kegiatanConfig[k].attrs.filter((a) => a.type === "select").map((a) => `${a.key} [${a.options!.join(" | ")}]`).join("; ") || "-"}`),
  ].join("\n");
  const parsed = geminiResult.parse(
    await geminiJson(key, prompt, {
      type: "OBJECT",
      properties: {
        jenis: { type: "STRING", enum: [...kegiatanKeys] },
        deskripsi: { type: "STRING" },
        atribut: { type: "ARRAY", items: { type: "OBJECT", properties: { key: { type: "STRING" }, value: { type: "STRING" } }, required: ["key", "value"] } },
      },
      required: ["jenis", "deskripsi", "atribut"],
    }),
  );
  const jenis = input.jenis ?? parsed.jenis;
  const selects = new Map(kegiatanConfig[jenis].attrs.filter((a) => a.type === "select").map((a) => [a.key, a.options!]));
  return {
    source: "gemini",
    jenis,
    deskripsi: parsed.deskripsi || local({ ...input, jenis }).deskripsi,
    atribut: Object.fromEntries(parsed.atribut.filter((a) => selects.get(a.key)?.includes(a.value)).map((a) => [a.key, a.value])),
  };
}

/** Saran isian kegiatan keamanan: Gemini bila GEMINI_API_KEY tersedia, selain itu (atau bila gagal) heuristik lokal. */
export async function suggestKeamanan(input: KeamananSuggestInput): Promise<KeamananSuggestion> {
  const key = process.env.GEMINI_API_KEY;
  if (key) {
    try {
      return await gemini(input, key);
    } catch (error) {
      console.warn("Saran AI Gemini gagal, memakai heuristik lokal:", error);
    }
  }
  return local(input);
}
