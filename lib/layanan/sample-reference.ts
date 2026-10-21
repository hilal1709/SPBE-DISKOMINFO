import { makeRabIndex, type RabNode, type RabSet } from "@/lib/probis/rab-index";
import { samplePeriods } from "@/lib/probis/reference";
import ralReference from "./ral-reference.json";

// Dipisah dari reference.ts agar JSON referensi bawaan tidak ikut bundel klien (hanya server, data contoh, dan skrip).

export const sampleRal = makeRabIndex(ralReference as RabNode[]);

/** Kumpulan RAL cadangan (database tidak tersedia): satu versi bawaan untuk semua periode contoh. */
export const sampleRalSet: RabSet = {
  versions: [{ id: "bawaan", name: "Perpres 132/2022", nodes: sampleRal.nodes }],
  periodVersion: Object.fromEntries(samplePeriods.map((p) => [p, "bawaan"])),
  activeVersion: "bawaan",
};
