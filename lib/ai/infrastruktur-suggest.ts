import { z } from "zod";
import { infraTargets, jenisConfig, jenisKeys, type InfraJenis } from "@/lib/infrastruktur/jenis";
import { isRaiLeaf } from "@/lib/infrastruktur/reference";
import type { RabIndex } from "@/lib/probis/rab-index";
import { pdByCode } from "@/lib/probis/reference";
import { geminiJson } from "./gemini";
import { tokens } from "./text";

/** Komponen lain pada periode isian (kandidat relasi). */
export type InfraCandidate = { code: string; name: string; opd: string; jenis: InfraJenis };
export type InfrastrukturSuggestInput = { name: string; opd: string; jenis?: InfraJenis | null; note?: string };
export type InfrastrukturSuggestion = {
  source: "gemini" | "lokal";
  jenis: InfraJenis;
  deskripsi: string;
  /** RAI terdalam (L3, atau L2 tanpa turunan). */
  rai: { code: string; reason: string }[];
  /** Kolom khusus komponen yang bisa disimpulkan dari nama/catatan. */
  atribut: Record<string, string>;
  relasi: { code: string; reason: string }[];
};

/* ---------- Heuristik lokal (gratis, tanpa API) ---------- */

const guesses: [RegExp, InfraJenis][] = [
  [/firewall|waf|ids|ips|anti.?ddos|vpn gateway/i, "perangkat_keamanan"],
  [/\bnas\b|\bsan\b|storage|penyimpan|backup storage/i, "penyimpanan"],
  [/ups|cctv|printer|pemindai|scanner|videotron|proyektor/i, "periferal"],
  [/ubuntu|windows|linux|centos|rocky|debian|postgres|mysql|maria|oracle|sql server|mongo|vmware|proxmox|veeam|docker|kubernetes/i, "platform"],
  [/router|switch|access point|\bap\b|modem|load balancer/i, "jaringan"],
  [/splp|api gateway|service bus|penghubung|broker/i, "splp"],
  [/cloud|awan|hosting|\bpdn\b|pusat data nasional/i, "cloud"],
  [/server/i, "server"],
  [/jaringan|fiber|internet|\bvpn\b|intranet|metro|mpls|jip/i, "jip"],
  [/data center|ruang server|pusat data|command center|pusat kendali|fasilitas/i, "fasilitas"],
];

const guessJenis = (text: string): InfraJenis => guesses.find(([re]) => re.test(text))?.[1] ?? "server";

/** Rangking kandidat relasi: kata kunci sama, lalu milik instansi yang sama. */
function rankRelasi(text: string, opd: string, jenis: InfraJenis, list: InfraCandidate[], max: number) {
  const allowed = new Set<string>(infraTargets(jenis));
  const query = new Set(tokens(text));
  return list
    .filter((c) => allowed.has(c.jenis))
    .map((c) => {
      const hits = [...new Set(tokens(c.name).filter((t) => query.has(t)))];
      return { c, hits, score: hits.length + (c.opd === opd ? 0.6 : 0) + (c.jenis === "fasilitas" ? 0.3 : 0) };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((r) => ({ code: r.c.code, reason: r.hits.length ? `Cocok dengan kata kunci: ${r.hits.join(", ")}` : `${jenisConfig[r.c.jenis].short} milik instansi yang sama` }));
}

function local(input: InfrastrukturSuggestInput, rai: RabIndex, infra: InfraCandidate[]): InfrastrukturSuggestion {
  const text = `${input.name} ${input.note ?? ""}`;
  const jenis = input.jenis ?? guessJenis(text);
  const cfg = jenisConfig[jenis];
  const pd = pdByCode.get(input.opd);
  // Pilihan tetap yang namanya muncul di nama/catatan (mis. "Firewall", "Sistem database").
  const atribut = Object.fromEntries(
    cfg.attrs
      .filter((a) => a.type === "select")
      .map((a) => [a.key, a.options!.find((o) => new RegExp(o.split(/[\s/(]/)[0]!, "i").test(text))])
      .filter((e): e is [string, string] => !!e[1]),
  );
  const raiNode = rai.byCode.get(cfg.rai);
  return {
    source: "lokal",
    jenis,
    deskripsi: `${cfg.label} ${input.name} yang dikelola ${pd?.name ?? "Perangkat Daerah"} untuk mendukung penyelenggaraan SPBE.`,
    rai: raiNode && isRaiLeaf(rai, cfg.rai) ? [{ code: cfg.rai, reason: `RAI bawaan ${cfg.label}` }] : [],
    atribut,
    relasi: rankRelasi(text, input.opd, jenis, infra, 3),
  };
}

/* ---------- Gemini ---------- */

const geminiResult = z.object({
  jenis: z.enum(jenisKeys),
  deskripsi: z.string(),
  rai: z.array(z.object({ code: z.string(), reason: z.string() })).max(5),
  atribut: z.array(z.object({ key: z.string(), value: z.string() })).max(12),
  relasi: z.array(z.object({ code: z.string(), reason: z.string() })).max(6),
});

async function gemini(input: InfrastrukturSuggestInput, key: string, rai: RabIndex, infra: InfraCandidate[]): Promise<InfrastrukturSuggestion> {
  const leaves = rai.nodes.filter((n) => rai.active(n) && isRaiLeaf(rai, n.code));
  const pd = pdByCode.get(input.opd);
  const shortlist = [...infra.filter((c) => c.opd === input.opd), ...infra.filter((c) => c.opd !== input.opd)].slice(0, 120);
  const prompt = [
    "Anda analis arsitektur SPBE Pemerintah Kabupaten Gresik. Lengkapi isian Domain Arsitektur Infrastruktur berikut dalam bahasa Indonesia baku dan singkat.",
    `Nama komponen: ${input.name}`,
    `Instansi: ${pd?.name ?? input.opd}`,
    input.jenis ? `Komponen: ${jenisConfig[input.jenis].label}` : "",
    input.note ? `Catatan pengisi: ${input.note}` : "",
    "",
    "Tugas:",
    `1. jenis: ${input.jenis ? `tetap ${input.jenis}` : `salah satu dari ${jenisKeys.join(", ")}`}.`,
    "2. deskripsi: 1 kalimat deskripsi komponen.",
    "3. rai: maksimal 2 kode RAI paling relevan dari daftar RAI.",
    "4. atribut: pasangan key/value untuk kolom khusus komponen yang bisa disimpulkan (kunci & pilihan di bawah). Jangan mengarang angka kapasitas.",
    "5. relasi: maksimal 3 kode komponen terkait dari daftar komponen (mis. fasilitas tempat server berada).",
    "",
    "Kolom khusus per komponen (key: pilihan):",
    ...jenisKeys.map((k) => `${k}: ${jenisConfig[k].attrs.map((a) => `${a.key}${a.options ? ` [${a.options.join(" | ")}]` : ""}`).join("; ")}`),
    "",
    "RAI (kode nama):",
    ...leaves.map((n) => `${n.code} ${n.name}`),
    "",
    "Komponen yang sudah ada (kode jenis nama):",
    ...shortlist.map((c) => `${c.code} ${c.jenis} ${c.name}`),
  ].join("\n");

  const pickList = { type: "ARRAY", items: { type: "OBJECT", properties: { code: { type: "STRING" }, reason: { type: "STRING" } }, required: ["code", "reason"] } };
  const parsed = geminiResult.parse(
    await geminiJson(key, prompt, {
      type: "OBJECT",
      properties: {
        jenis: { type: "STRING", enum: [...jenisKeys] },
        deskripsi: { type: "STRING" },
        rai: pickList,
        atribut: { type: "ARRAY", items: { type: "OBJECT", properties: { key: { type: "STRING" }, value: { type: "STRING" } }, required: ["key", "value"] } },
        relasi: pickList,
      },
      required: ["jenis", "deskripsi", "rai", "atribut", "relasi"],
    }),
  );

  const jenis = input.jenis ?? parsed.jenis;
  const fallback = local({ ...input, jenis }, rai, infra);
  const attrs = new Map(jenisConfig[jenis].attrs.map((a) => [a.key, a]));
  const allowed = new Set<string>(infraTargets(jenis));
  const codes = new Map(infra.map((c) => [c.code, c]));
  const raiPicks = parsed.rai.filter((r) => isRaiLeaf(rai, r.code) && rai.active(rai.byCode.get(r.code))).slice(0, 2);
  return {
    source: "gemini",
    jenis,
    deskripsi: parsed.deskripsi || fallback.deskripsi,
    rai: raiPicks.length ? raiPicks : fallback.rai,
    // Hanya kunci milik komponen; pilihan tetap harus salah satu opsinya.
    atribut: Object.fromEntries(parsed.atribut.filter((a) => attrs.has(a.key) && a.value && (!attrs.get(a.key)!.options || attrs.get(a.key)!.options!.includes(a.value))).map((a) => [a.key, a.value])),
    relasi: parsed.relasi.filter((r) => codes.has(r.code) && allowed.has(codes.get(r.code)!.jenis)).slice(0, 3),
  };
}

/** Saran isian komponen: Gemini bila GEMINI_API_KEY tersedia, selain itu (atau bila gagal) heuristik lokal. */
export async function suggestInfrastruktur(input: InfrastrukturSuggestInput, rai: RabIndex, infra: InfraCandidate[]): Promise<InfrastrukturSuggestion> {
  const key = process.env.GEMINI_API_KEY;
  if (key) {
    try {
      return await gemini(input, key, rai, infra);
    } catch (error) {
      console.warn("Saran AI Gemini gagal, memakai heuristik lokal:", error);
    }
  }
  return local(input, rai, infra);
}
