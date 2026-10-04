import type { Probis } from "@/lib/types";
import { ikuBySasaran, perangkatDaerah, sampleActivePeriod as activePeriod, samplePeriods as periods, sampleRab, sasaranBySektor, sasaranStrategis, type ProbisStatus } from "./reference";

/** PRNG deterministik agar data dummy sama di server dan klien. */
export function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const activities = ["Penyusunan Rencana", "Pelaksanaan", "Monitoring dan Evaluasi", "Pengelolaan", "Pelayanan", "Pembinaan", "Fasilitasi", "Koordinasi", "Pendataan", "Pelaporan", "Penyusunan Standar", "Sosialisasi"];
const qualifiers = ["", "", "Tingkat Kabupaten", "Berbasis Elektronik", "Terpadu", "Lintas Sektor", "Tahunan"];
/** Urusan penunjang yang dimiliki semua PD (keuangan, kepegawaian, perencanaan). */
const supporting = ["09.02", "09.06", "09.05"];

/** Jumlah status sesuai rekap: AS-IS 1.513, Upgrade 143, Baru 189. */
const statusCounts: [ProbisStatus, number][] = [["as_is", 1513], ["upgrade", 143], ["new", 189]];

function generate(): Probis[] {
  const random = mulberry32(2026);
  const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)]!;
  const childrenOf = new Map<string, string[]>();
  const rabNodes = sampleRab.nodes;
  for (const node of rabNodes) if (node.parent) childrenOf.set(node.parent, [...(childrenOf.get(node.parent) ?? []), node.code]);

  const statuses = statusCounts.flatMap(([status, n]) => Array<ProbisStatus>(n).fill(status));
  for (let i = statuses.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [statuses[i], statuses[j]] = [statuses[j]!, statuses[i]!];
  }

  const sequence = new Map<string, number>();
  const rows: Probis[] = [];
  for (const pd of perangkatDaerah) {
    for (let i = 0; i < pd.total; i++) {
      const rab2 = `RAB.${random() < 0.85 ? pick(pd.rab2) : pick(supporting)}`;
      const rab3 = pick(childrenOf.get(rab2)!);
      const rab1 = rab2.slice(0, 6);
      const seq = (sequence.get(rab3) ?? 0) + 1;
      sequence.set(rab3, seq);
      const subject = rabNodes.find((n) => n.code === rab2)!.name;
      const name = [pick(activities), subject, pick(qualifiers)].filter(Boolean).join(" ");
      const sasaran = pick(sasaranBySektor[rab1.slice(4)]!);
      rows.push({
        id: `GSK-DAB ${rab3.slice(4)}.${String(seq).padStart(2, "0")}`,
        name,
        uraian: `${name} pada ${pd.name}, meliputi penyiapan bahan, pelaksanaan kegiatan, pengendalian mutu, dan pelaporan hasil secara berkala.`,
        pd: pd.code,
        status: statuses[rows.length]!,
        period: activePeriod,
        sasaran: sasaranStrategis[sasaran]!,
        iku: ikuBySasaran[sasaran]!,
        rab1,
        rab2,
        rab3,
      });
    }
  }
  return [...rows, ...previousPeriod(rows, mulberry32(2021))];
}

/**
 * Arsitektur periode sebelumnya (versioning per 5 tahun): probis yang kini AS-IS/Upgrade sudah ada,
 * probis "Baru" belum ada. Statusnya relatif terhadap periode tersebut.
 */
function previousPeriod(current: Probis[], random: () => number): Probis[] {
  const previous = periods.find((p) => p !== activePeriod)!;
  return current
    .filter((p) => p.status !== "new")
    .map((p) => {
      const r = random();
      return { ...p, period: previous, status: r < 0.12 ? "new" : r < 0.2 ? "upgrade" : "as_is" } satisfies Probis;
    });
}

let cache: Probis[] | undefined;

/** Seluruh probis semua periode (dummy deterministik, dibuat sekali per modul). Periode aktif berisi 1.845. */
export function allProbis() {
  return (cache ??= generate());
}
