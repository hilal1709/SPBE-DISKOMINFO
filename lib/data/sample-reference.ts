import { makeRabIndex, type RabNode, type RabSet } from "@/lib/probis/rab-index";
import { samplePeriods } from "@/lib/probis/reference";
import radReference from "./rad-reference.json";

// Dipisah dari reference.ts agar JSON referensi bawaan tidak ikut bundel klien (hanya server, data contoh, dan skrip).

export const sampleRad = makeRabIndex(radReference as RabNode[]);

/** Kumpulan RAD cadangan (database tidak tersedia): satu versi bawaan untuk semua periode contoh. */
export const sampleRadSet: RabSet = {
  versions: [{ id: "bawaan", name: "Perpres 132/2022", nodes: sampleRad.nodes }],
  periodVersion: Object.fromEntries(samplePeriods.map((p) => [p, "bawaan"])),
  activeVersion: "bawaan",
};

/** Nama RAD L2 diawali "Data …"; nama RAL L2 tidak. */
const bare = (name: string) => name.replace(/^data\s+/i, "").toLowerCase();

/** RAL L2 tanpa padanan nama di RAD. */
const ralFallback: Record<string, string> = {
  "RAL.01.03": "RAD.09.07",
  "RAL.01.04": "RAD.02.10",
  "RAL.01.16": "RAD.02.08",
  "RAL.01.24": "RAD.09.01",
  "RAL.02.06": "RAD.09.06",
  "RAL.02.07": "RAD.09.06",
  "RAL.02.08": "RAD.09.06",
  "RAL.02.09": "RAD.09.03",
};

/** Urusan layanan (RAL L2) → kelompok data tematik (RAD L2). */
export function radForRal2(ral2: string, ralName: string | undefined) {
  const name = ralName?.toLowerCase();
  return sampleRad.level(2).find((n) => bare(n.name) === name)?.code ?? ralFallback[ral2];
}
