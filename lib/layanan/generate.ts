import { allProbis, mulberry32 } from "@/lib/probis/generate";
import { perangkatDaerah, sampleActivePeriod as activePeriod, samplePeriods as periods, sampleRab } from "@/lib/probis/reference";
import type { Layanan } from "@/lib/types";
import { ekonomiByTarget, kementerianByRal2, layananByRal2, manfaatByTarget, ralForRab2, risikoMitigasi, sampleRal, unitPelaksana, type Metode, type Target } from "./reference";

/** Peluang metode per target: layanan kepegawaian paling banyak sudah elektronik. */
const metodeOdds: Record<Target, [number, number]> = { masyarakat: [0.4, 0.28], usaha: [0.5, 0.25], asn: [0.68, 0.17], pemerintah: [0.45, 0.22] };
/** Layanan administrasi yang dimiliki semua PD (keuangan, kepegawaian). */
const supporting = ["RAB.09.02", "RAB.09.06"];
const digitalOnly = /tanpa datang|jaringan atau sistem|literasi digital/i;
const lower = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

function generate(): Layanan[] {
  const random = mulberry32(2029);
  const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)]!;
  const probis = allProbis().filter((p) => p.period === activePeriod);
  const sequence = new Map<string, number>();
  const rows: Layanan[] = [];

  /** Kandidat [nama, target, RAB 2, RAL 2] untuk sekumpulan urusan RAB 2. */
  const candidates = (rab2s: string[]) =>
    rab2s.flatMap((rab2) => {
      const ral2 = ralForRab2(rab2, sampleRab);
      return ral2 && sampleRal.children(ral2).length ? (layananByRal2[ral2] ?? []).map(([base, target]) => ({ base, target, rab2, ral2 })) : [];
    });
  const shuffle = <T,>(list: T[]) => {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [list[i], list[j]] = [list[j]!, list[i]!];
    }
    return list;
  };

  for (const pd of perangkatDaerah) {
    const want = Math.max(1, Math.round(pd.total / 4.5));
    // Mayoritas layanan dari urusan utama PD; 1–2 layanan administrasi (keuangan/kepegawaian).
    const admin = shuffle(candidates(supporting)).slice(0, want > 8 ? 2 : 1);
    const domain = shuffle(candidates(pd.rab2.map((code) => `RAB.${code}`))).slice(0, Math.max(want - admin.length, 1));
    for (const { base, target, rab2, ral2 } of [...domain, ...admin]) {
      const ral3 = closestChild(ral2, base, pick);
      const seq = (sequence.get(ral3) ?? 0) + 1;
      sequence.set(ral3, seq);
      const [e, h] = metodeOdds[target];
      const r = random();
      const metode: Metode = r < e ? "elektronik" : r < e + h ? "hybrid" : "tatap_muka";
      // Manfaat/risiko khas kanal digital hanya untuk layanan Elektronik/Hybrid.
      const offline = metode === "tatap_muka";
      const [risiko, mitigasi] = pick(offline ? risikoMitigasi.filter(([r]) => !digitalOnly.test(r)) : risikoMitigasi);
      const related = probis.filter((p) => p.pd === pd.code && p.rab2 === rab2);
      const linked = related.length ? [...new Set([pick(related), ...(random() < 0.45 ? [pick(related)] : [])])] : [];
      rows.push({
        id: `GSK-LYN ${ral3.slice(4)}.${String(seq).padStart(2, "0")}`,
        name: `Layanan ${base}`,
        tujuan: `Menyelenggarakan ${lower(base)} yang cepat, mudah, dan akuntabel bagi ${targetText[target]}.`,
        fungsi: `Mendukung ${lower(sampleRal.byCode.get(ral3)!.name)} pada ${pd.name}.`,
        pd: pd.code,
        unit: `${pick(unitPelaksana)} ${pd.name}`,
        target,
        metode,
        period: activePeriod,
        ral1: ral2.slice(0, 6),
        ral2,
        ral3,
        rab2,
        manfaat: pick(offline ? manfaatByTarget[target].filter((m) => !digitalOnly.test(m)) : manfaatByTarget[target]),
        ekonomi: pick(ekonomiByTarget[target]),
        risiko,
        mitigasi,
        kl: kementerianByRal2[ral2] ?? null,
        probis: linked.map((p) => ({ id: p.id, name: p.name })),
      });
    }
  }
  return [...rows, ...previousPeriod(rows, mulberry32(2024))];
}

const targetText: Record<Target, string> = { masyarakat: "masyarakat", usaha: "pelaku usaha", asn: "ASN", pemerintah: "Perangkat Daerah" };

/** RAL 3 yang namanya paling mirip dengan nama layanan; acak bila tidak ada kata yang sama. */
function closestChild(ral2: string, name: string, pick: <T>(list: readonly T[]) => T) {
  const words = (text: string) => new Set(text.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
  const own = words(name);
  const scored = sampleRal.children(ral2).map((n) => ({ code: n.code, score: [...words(n.name)].filter((w) => own.has(w)).length }));
  const best = Math.max(...scored.map((s) => s.score));
  return pick(scored.filter((s) => s.score === best)).code;
}

/** Periode sebelumnya: sebagian layanan belum ada dan lebih banyak yang masih tatap muka. */
function previousPeriod(current: Layanan[], random: () => number): Layanan[] {
  const previous = periods.find((p) => p !== activePeriod)!;
  return current
    .filter(() => random() < 0.78)
    .map((l) => ({ ...l, period: previous, metode: l.metode !== "tatap_muka" && random() < 0.45 ? (random() < 0.5 ? "hybrid" : "tatap_muka") : l.metode }) satisfies Layanan);
}

let cache: Layanan[] | undefined;

/** Seluruh layanan contoh semua periode (deterministik, dibuat sekali per modul). */
export function allLayanan() {
  return (cache ??= generate());
}
