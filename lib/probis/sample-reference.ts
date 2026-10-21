import rabReference from "./rab-reference.json";
import { makeRabIndex, type RabNode, type RabSet } from "./rab-index";
import { samplePeriods } from "./reference";

// Dipisah dari reference.ts agar JSON referensi bawaan tidak ikut bundel klien (hanya server, data contoh, dan skrip).

/**
 * Referensi RAB bawaan template (versi awal). Hanya untuk data contoh dan cadangan bila database
 * tidak tersedia — referensi yang berlaku dibaca dari database per versi (lib/probis/rab.ts).
 */
export const sampleRab = makeRabIndex(rabReference as RabNode[]);

/** Kumpulan RAB cadangan: satu versi bawaan untuk semua periode contoh. */
export const sampleRabSet: RabSet = {
  versions: [{ id: "bawaan", name: "Perpres 132/2022", nodes: sampleRab.nodes }],
  periodVersion: Object.fromEntries(samplePeriods.map((p) => [p, "bawaan"])),
  activeVersion: "bawaan",
};
