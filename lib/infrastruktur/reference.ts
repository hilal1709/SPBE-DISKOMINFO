import { makeRabIndex, type RabNode, type RabSet } from "@/lib/probis/rab-index";
import { samplePeriods } from "@/lib/probis/reference";
import raiReference from "./rai-reference.json";

/** Referensi Domain Infrastruktur (sumber: template analis "Domain Arsitektur Infrastruktur"). RAI baru sampai Level 2. */
export const sampleRai = makeRabIndex(raiReference as RabNode[]);

/** Kumpulan RAI cadangan (database tidak tersedia): satu versi bawaan untuk semua periode contoh. */
export const sampleRaiSet: RabSet = {
  versions: [{ id: "bawaan", name: "Perpres 132/2022", nodes: sampleRai.nodes }],
  periodVersion: Object.fromEntries(samplePeriods.map((p) => [p, "bawaan"])),
  activeVersion: "bawaan",
};

/** RAI yang boleh dipilih: Level 3, atau Level 2 yang tidak memiliki turunan (saat ini semua L2). */
export const isRaiLeaf = (rai: { byCode: Map<string, RabNode>; children: (code: string) => RabNode[] }, code: string | null | undefined) => {
  const node = code ? rai.byCode.get(code) : undefined;
  return !!node && (node.level === 3 || (node.level === 2 && !rai.children(node.code).length));
};
