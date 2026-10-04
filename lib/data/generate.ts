import { allLayanan } from "@/lib/layanan/generate";
import { sampleRal } from "@/lib/layanan/reference";
import { mulberry32 } from "@/lib/probis/generate";
import { pdByCode, perangkatDaerah, sampleActivePeriod as activePeriod, samplePeriods as periods } from "@/lib/probis/reference";
import type { DataInfo, Layanan } from "@/lib/types";
import { radForRal2, sampleRad, type Jenis, type Sifat } from "./reference";

/** Pola nama data turunan sebuah layanan; pola pertama selalu dipakai. */
const patterns = ["Data %", "Data Permohonan %", "Rekapitulasi %", "Data Penerima %", "Register %", "Data Capaian %"];
const tujuanList = [
  "Menjadi dasar perencanaan dan evaluasi program",
  "Mendukung pelaporan kinerja kepada pimpinan dan Kementerian/Lembaga",
  "Menyediakan data tunggal yang dapat dibagipakaikan antar Perangkat Daerah",
  "Memantau capaian layanan secara berkala",
  "Mendukung pengambilan keputusan berbasis data",
];
/** Peluang frekuensi pemutakhiran; layanan elektronik umumnya menghasilkan data realtime. */
const validitasOdds: Record<Layanan["metode"], [string, number][]> = {
  elektronik: [["Realtime", 0.62], ["Harian", 0.1], ["Bulanan", 0.1], ["Tahunan", 0.08], ["Mingguan", 0.03], ["Tiga Bulanan", 0.03], ["Enam Bulanan", 0.02], ["Lainnya", 0.02]],
  hybrid: [["Realtime", 0.4], ["Bulanan", 0.18], ["Harian", 0.1], ["Tahunan", 0.12], ["Tiga Bulanan", 0.08], ["Enam Bulanan", 0.05], ["Mingguan", 0.04], ["Lainnya", 0.03]],
  tatap_muka: [["Bulanan", 0.26], ["Tahunan", 0.24], ["Realtime", 0.14], ["Tiga Bulanan", 0.12], ["Enam Bulanan", 0.08], ["Harian", 0.05], ["Lima Tahunan", 0.04], ["Dua Tahunan", 0.03], ["Lainnya", 0.04]],
};
const interopOdds: Record<Layanan["metode"], number> = { elektronik: 0.72, hybrid: 0.48, tatap_muka: 0.16 };
const lower = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

function generate(): DataInfo[] {
  const random = mulberry32(2031);
  const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)]!;
  const weighted = (odds: [string, number][]) => {
    let r = random();
    for (const [value, p] of odds) if ((r -= p) < 0) return value;
    return odds.at(-1)![0];
  };
  const sequence = new Map<string, number>();
  const rows: DataInfo[] = [];

  for (const layanan of allLayanan().filter((l) => l.period === activePeriod)) {
    const rad2 = radForRal2(layanan.ral2, sampleRal.byCode.get(layanan.ral2)?.name) ?? "RAD.10.04";
    const base = layanan.name.replace(/^Layanan\s+/, "");
    const names = [patterns[0]!, ...(random() < 0.55 ? [pick(patterns.slice(1))] : [])].map((p) => p.replace("%", base));
    for (const name of names) {
      // Sebagian kecil data hanya sampai RAD L2 (mis. Data Dukung Lainnya), seperti isian analis.
      const own = random() < 0.03 ? "RAD.10.04" : rad2;
      const rad3 = sampleRad.children(own).length ? closestChild(own, name, pick) : null;
      const key = rad3 ?? own;
      const seq = (sequence.get(key) ?? 0) + 1;
      sequence.set(key, seq);
      const keuangan = own === "RAD.09.02" || /dana|anggaran|pajak|retribusi|hibah|gaji|bantuan|keuangan/i.test(name);
      const jenis: Jenis = keuangan ? "keuangan" : /^RAD\.0[37]/.test(own) && random() < 0.4 ? "geopasial" : random() < 0.82 ? "statistik" : "lainnya";
      const r = random();
      const sifat: Sifat = keuangan ? (r < 0.45 ? "tertutup" : "terbatas") : r < 0.58 ? "terbatas" : r < 0.86 ? "terbuka" : "tertutup";
      const pd = pdByCode.get(layanan.pd)!;
      rows.push({
        id: `GSK-DAT ${key.slice(4)}.${String(seq).padStart(2, "0")}`,
        name,
        uraian: `${name} yang dihimpun dari ${lower(layanan.name)} pada ${pd.name}.`,
        tujuan: `${pick(tujuanList)}.`,
        produsen: random() < 0.18 ? pick(perangkatDaerah).code : layanan.pd,
        wali: layanan.pd,
        output: random() < 0.7 ? `Laporan ${base}` : null,
        input: random() < 0.6 ? `Berkas permohonan ${base}` : null,
        sifat,
        jenis,
        validitas: weighted(validitasOdds[layanan.metode]),
        interoperabel: random() < interopOdds[layanan.metode],
        period: activePeriod,
        rad1: own.slice(0, 6),
        rad2: own,
        rad3,
        probis: layanan.probis,
        layanan: [{ id: layanan.id, name: layanan.name }],
      });
    }
  }
  return [...rows, ...previousPeriod(rows, mulberry32(2025))];
}

/** RAD 3 yang namanya paling mirip dengan nama data; acak bila tidak ada kata yang sama. */
function closestChild(rad2: string, name: string, pick: <T>(list: readonly T[]) => T) {
  const words = (text: string) => new Set(text.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
  const own = words(name);
  const scored = sampleRad.children(rad2).map((n) => ({ code: n.code, score: [...words(n.name)].filter((w) => own.has(w)).length }));
  const best = Math.max(...scored.map((s) => s.score));
  return pick(scored.filter((s) => s.score === best)).code;
}

/** Periode sebelumnya: sebagian data belum ada, lebih sedikit yang interoperabel. */
function previousPeriod(current: DataInfo[], random: () => number): DataInfo[] {
  const previous = periods.find((p) => p !== activePeriod)!;
  return current
    .filter(() => random() < 0.76)
    .map((d) => ({
      ...d,
      period: previous,
      interoperabel: d.interoperabel && random() < 0.55,
      validitas: d.validitas === "Realtime" && random() < 0.4 ? "Bulanan" : d.validitas,
    }));
}

let cache: DataInfo[] | undefined;

/** Seluruh data contoh semua periode (deterministik, dibuat sekali per modul). */
export function allData() {
  return (cache ??= generate());
}
