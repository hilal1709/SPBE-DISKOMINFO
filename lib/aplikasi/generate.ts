import { allData } from "@/lib/data/generate";
import { allLayanan } from "@/lib/layanan/generate";
import { allProbis, mulberry32 } from "@/lib/probis/generate";
import { pdByCode, sampleActivePeriod as activePeriod, samplePeriods as periods } from "@/lib/probis/reference";
import type { Aplikasi, DataInfo, Layanan, Probis } from "@/lib/types";
import { kepemilikanOf, type Basis } from "./reference";

type Seed = { name: string; uraian: string; pengembang: string; operasional: string; raa2: string; basis?: Basis; layanan?: RegExp };

/** Aplikasi umum nasional yang dioperasikan Perangkat Daerah. */
const pusat: Seed[] = [
  { name: "SRIKANDI", uraian: "Sistem Informasi Kearsipan Dinamis Terintegrasi untuk tata naskah dinas elektronik", pengembang: "Arsip Nasional RI", operasional: "DISPERPUSIP", raa2: "RAA.01.02", layanan: /arsip/i },
  { name: "SIPD Perencanaan", uraian: "Sistem Informasi Pemerintahan Daerah untuk perencanaan pembangunan daerah", pengembang: "Kementerian Dalam Negeri", operasional: "BAPPEDA", raa2: "RAA.01.02", layanan: /rencana|pembangunan/i },
  { name: "SIPD Penatausahaan Keuangan", uraian: "Penganggaran dan penatausahaan keuangan daerah dalam SIPD", pengembang: "Kementerian Dalam Negeri", operasional: "BPPKAD", raa2: "RAA.01.02", layanan: /anggaran|keuangan/i },
  { name: "e-Kinerja BKN", uraian: "Pengelolaan kinerja ASN berbasis SKP", pengembang: "Badan Kepegawaian Negara", operasional: "BKPSDM", raa2: "RAA.01.02", layanan: /kinerja/i },
  { name: "SIASN", uraian: "Sistem Informasi ASN untuk data dan layanan kepegawaian", pengembang: "Badan Kepegawaian Negara", operasional: "BKPSDM", raa2: "RAA.01.02", layanan: /pegawai|mutasi|pensiun/i },
  { name: "SSCASN", uraian: "Seleksi calon ASN secara nasional", pengembang: "Badan Kepegawaian Negara", operasional: "BKPSDM", raa2: "RAA.01.01", layanan: /pengadaan|seleksi/i },
  { name: "SP4N-LAPOR!", uraian: "Pengelolaan pengaduan pelayanan publik nasional", pengembang: "Kementerian PANRB", operasional: "DISKOMINFO", raa2: "RAA.01.01", layanan: /aduan|pengaduan/i },
  { name: "SPSE", uraian: "Sistem Pengadaan Secara Elektronik", pengembang: "LKPP", operasional: "SETDA", raa2: "RAA.01.02", layanan: /pengadaan/i },
  { name: "SiRUP", uraian: "Sistem Informasi Rencana Umum Pengadaan", pengembang: "LKPP", operasional: "SETDA", raa2: "RAA.01.02" },
  { name: "SATUSEHAT", uraian: "Platform pertukaran data kesehatan nasional", pengembang: "Kementerian Kesehatan", operasional: "DINKES", raa2: "RAA.02.01", basis: "cloud", layanan: /kesehatan|puskesmas/i },
  { name: "ePPGBM", uraian: "Pencatatan dan pelaporan gizi berbasis masyarakat", pengembang: "Kementerian Kesehatan", operasional: "DINKES", raa2: "RAA.02.02", layanan: /gizi|stunting/i },
  { name: "SIKS-NG", uraian: "Pengelolaan Data Terpadu Kesejahteraan Sosial", pengembang: "Kementerian Sosial", operasional: "DINSOS", raa2: "RAA.02.01", layanan: /sosial|bantuan/i },
  { name: "OSS RBA", uraian: "Perizinan berusaha berbasis risiko", pengembang: "Kementerian Investasi/BKPM", operasional: "DPMPTSP", raa2: "RAA.01.01", layanan: /izin|perizinan/i },
  { name: "SIMBG", uraian: "Persetujuan bangunan gedung dan sertifikat laik fungsi", pengembang: "Kementerian PUPR", operasional: "DPUTR", raa2: "RAA.01.01", layanan: /bangunan/i },
  { name: "Dapodik", uraian: "Data pokok pendidikan satuan pendidikan, peserta didik, dan PTK", pengembang: "Kementerian Pendidikan Dasar dan Menengah", operasional: "DISPENDIK", raa2: "RAA.02.02", basis: "desktop", layanan: /sekolah|didik|pendidikan/i },
  { name: "SIAK Terpusat", uraian: "Administrasi kependudukan terpusat", pengembang: "Kementerian Dalam Negeri", operasional: "DISPENDUKCAPIL", raa2: "RAA.02.02", layanan: /penduduk|akta|ktp|kartu/i },
  { name: "SIMLUH", uraian: "Sistem informasi manajemen penyuluhan pertanian", pengembang: "Kementerian Pertanian", operasional: "DISTAN", raa2: "RAA.02.02", basis: "mobile", layanan: /tani|penyuluh/i },
  { name: "Romantik", uraian: "Rekomendasi kegiatan statistik sektoral", pengembang: "Badan Pusat Statistik", operasional: "DISKOMINFO", raa2: "RAA.01.02", layanan: /statistik/i },
];

/** Aplikasi inti Pemkab yang tidak berasal dari satu layanan. */
const inti: Seed[] = [
  { name: "Gresik Satu Data", uraian: "Portal data sektoral Kabupaten Gresik untuk berbagi pakai data antar Perangkat Daerah", pengembang: "DISKOMINFO", operasional: "DISKOMINFO", raa2: "RAA.02.02", layanan: /data|statistik/i },
  { name: "Portal Gresik", uraian: "Portal informasi dan berita resmi Pemerintah Kabupaten Gresik", pengembang: "DISKOMINFO", operasional: "DISKOMINFO", raa2: "RAA.01.01", layanan: /informasi|publikasi/i },
  { name: "PPID Gresik", uraian: "Layanan permohonan informasi publik", pengembang: "DISKOMINFO", operasional: "DISKOMINFO", raa2: "RAA.01.01", layanan: /informasi/i },
  { name: "JDIH Gresik", uraian: "Jaringan dokumentasi dan informasi hukum daerah", pengembang: "DISKOMINFO", operasional: "SETDA", raa2: "RAA.02.02", layanan: /hukum/i },
  { name: "Command Center Gresik", uraian: "Pemantauan terpadu kota dan tanggap darurat 112", pengembang: "DISKOMINFO", operasional: "DISKOMINFO", raa2: "RAA.02.01", layanan: /darurat|kebencanaan/i },
  { name: "e-Office Gresik", uraian: "Disposisi dan agenda surat internal Perangkat Daerah", pengembang: "PT Mitra Teknologi Nusantara", operasional: "SETDA", raa2: "RAA.02.02" },
];

const vendors = ["PT Mitra Teknologi Nusantara", "CV Solusi Digital Gresik", "PT Inovasi Data Jatim", "PT Sinergi Sistem Indonesia"];
/** Bahasa pemrograman beserta peluang dan kerangka pengembangannya. */
const stacks: [string, number, string[]][] = [
  ["PHP", 0.5, ["Laravel", "CodeIgniter", "Yii"]],
  ["JavaScript", 0.2, ["Next.js", "Vue.js", "Express"]],
  ["Java", 0.1, ["Spring Boot"]],
  ["Python", 0.08, ["Django", "Flask"]],
  ["Go", 0.04, ["Gin"]],
  ["Dart", 0.08, ["Flutter"]],
];
const mobileStack: [string, string[]] = ["Dart", ["Flutter"]];
/** Mesin basis data (peluang); aplikasi mobile sebagian memakai SQLite lokal. */
const mesinOdds: [string, number][] = [["MySQL", 0.46], ["PostgreSQL", 0.26], ["MariaDB", 0.12], ["SQL Server", 0.07], ["MongoDB", 0.05], ["Oracle", 0.04]];
const targetRaa: Record<Layanan["target"], [string, string]> = { masyarakat: ["RAA.02.01", "RAA.01.01"], usaha: ["RAA.02.01", "RAA.01.01"], asn: ["RAA.02.02", "RAA.01.02"], pemerintah: ["RAA.02.02", "RAA.01.02"] };
const targetCustomer: Record<Layanan["target"], string> = { masyarakat: "Masyarakat", usaha: "Pelaku usaha", asn: "ASN Pemkab Gresik", pemerintah: "Perangkat Daerah" };
const lower = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

function generate(): Aplikasi[] {
  const random = mulberry32(2033);
  const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)]!;
  const layanan = allLayanan().filter((l) => l.period === activePeriod);
  const data = allData().filter((d) => d.period === activePeriod);
  const dataByLayanan = new Map<string, DataInfo[]>();
  for (const d of data) for (const l of d.layanan) dataByLayanan.set(l.id, [...(dataByLayanan.get(l.id) ?? []), d]);
  const probisByPd = new Map<string, Probis[]>();
  for (const p of allProbis()) if (p.period === activePeriod) probisByPd.set(p.pd, [...(probisByPd.get(p.pd) ?? []), p]);
  const probisById = new Map([...probisByPd.values()].flat().map((p) => [p.id, p]));
  const sequence = new Map<string, number>();
  const names = new Set<string>();
  const rows: Aplikasi[] = [];

  const stack = (basis: Basis): [string, string | null] => {
    if (basis === "mobile") return [mobileStack[0], pick(mobileStack[1])];
    let r = random();
    for (const [bahasa, p, frameworks] of stacks) if ((r -= p) < 0) return [bahasa, pick(frameworks)];
    return ["PHP", "Laravel"];
  };
  const basisOf = (): Basis => {
    const r = random();
    return r < 0.68 ? "web" : r < 0.86 ? "mobile" : r < 0.94 ? "cloud" : "desktop";
  };

  const mesinOf = (basis: Basis) => {
    if (basis === "mobile" && random() < 0.3) return "SQLite";
    let r = random();
    for (const [mesin, p] of mesinOdds) if ((r -= p) < 0) return mesin;
    return "MySQL";
  };

  const push = (seed: Seed, layananLinked: Layanan[], target: Layanan["target"]) => {
    if (names.has(seed.name)) return;
    const linked = [...new Map(layananLinked.map((l) => [l.name, l])).values()];
    names.add(seed.name);
    const kepemilikan = kepemilikanOf(seed.pengembang);
    const seq = (sequence.get(seed.raa2) ?? 0) + 1;
    sequence.set(seed.raa2, seq);
    const basis = seed.basis ?? (kepemilikan === "pusat" ? (random() < 0.85 ? "web" : "cloud") : basisOf());
    const [bahasa, kerangka] = kepemilikan === "pusat" ? ["Tidak diketahui", null] : stack(basis);
    const own = linked.flatMap((l) => dataByLayanan.get(l.id) ?? []);
    const used = own.length ? own : data.filter((d) => d.wali === seed.operasional).slice(0, 2);
    const electronic = linked.some((l) => l.metode === "elektronik");
    const pd = pdByCode.get(seed.operasional)!;
    rows.push({
      id: `GSK-APL ${seed.raa2.slice(4)}.${String(seq).padStart(3, "0")}`,
      name: seed.name,
      uraian: `${seed.uraian}.`,
      fungsi: linked.length ? `Mendukung ${linked.map((l) => lower(l.name)).join(" dan ")}.` : `Mendukung tugas dan fungsi ${pd.name}.`,
      luaran: linked.length ? `Dokumen dan rekap ${lower(linked[0]!.name.replace(/^Layanan\s+/, ""))}` : `Laporan kegiatan ${pd.name}`,
      mesin: kepemilikan === "pusat" ? null : mesinOf(basis),
      basis,
      lisensi: kepemilikan === "pemda" ? (random() < 0.78 ? "open_source" : "proprietary") : random() < 0.75 ? "proprietary" : "open_source",
      bahasa,
      kerangka,
      pengembang: seed.pengembang,
      kepemilikan,
      operasional: seed.operasional,
      period: activePeriod,
      raa1: seed.raa2.slice(0, 6),
      raa2: seed.raa2,
      layanan: linked.map((l) => ({ id: l.id, name: l.name })),
      probis: probisFor(seed.operasional, linked).map((p) => ({ id: p.id, name: p.name, sasaran: p.sasaran, iku: p.iku })),
      data: used.map((d) => ({ id: d.id, name: d.name })),
      supplier: used.length ? [...new Set(used.map((d) => pdByCode.get(d.produsen)?.name ?? d.produsen))].join(", ") : null,
      customer: targetCustomer[target],
      cloud: kepemilikan === "pusat" ? "Pusat Data Nasional" : random() < 0.32 ? "Cloud Pemkab Gresik" : null,
      server: kepemilikan === "pusat" ? null : kepemilikan === "pihak_ketiga" && random() < 0.5 ? "Server penyedia" : "Data Center Diskominfo Gresik",
      splp: random() < (kepemilikan === "pusat" ? 0.62 : electronic ? 0.52 : 0.3) ? (kepemilikan === "pusat" ? "SPLP Nasional" : "SPLP Gresik") : null,
      jip: random() < (kepemilikan === "pusat" ? 0.35 : 0.6) ? "JIP Pemkab Gresik" : null,
    });
  };

  /** Aplikasi wajib selaras dengan probis: dari layanan yang didukung, atau probis PD operasional. */
  const probisFor = (pd: string, linked: Layanan[]) => {
    const own = [...new Set(linked.flatMap((l) => l.probis.map((p) => p.id)))].flatMap((id) => probisById.get(id) ?? []);
    return own.length ? own : [pick(probisByPd.get(pd) ?? probisByPd.get("SETDA")!)];
  };
  const related = (seed: Seed) => (seed.layanan ? layanan.filter((l) => l.pd === seed.operasional && seed.layanan!.test(l.name)).slice(0, 2) : []);
  for (const seed of [...pusat, ...inti]) push(seed, related(seed), seed.raa2.startsWith("RAA.01.01") || seed.raa2 === "RAA.02.01" ? "masyarakat" : "pemerintah");

  // Sebagian layanan elektronik/hybrid sudah memiliki aplikasi sendiri.
  for (const l of layanan) {
    if (l.metode === "tatap_muka" || random() > (l.metode === "elektronik" ? 0.62 : 0.34)) continue;
    const base = l.name.replace(/^Layanan\s+/, "");
    const word = base.split(/\s+/).find((w) => w.length > 4) ?? base;
    const name = pick([`Sistem Informasi ${base}`, `e-${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`, `${base} Online`, `Aplikasi ${base}`]);
    const r = random();
    const pengembang = r < 0.62 ? "DISKOMINFO" : r < 0.84 ? l.pd : pick(vendors);
    const [khusus, umum] = targetRaa[l.target];
    push({ name, uraian: `Aplikasi ${lower(base)} pada ${pdByCode.get(l.pd)!.name}`, pengembang, operasional: l.pd, raa2: random() < 0.72 ? khusus : umum }, [l], l.target);
  }
  return [...rows, ...previousPeriod(rows, mulberry32(2026))];
}

/** Periode sebelumnya: sebagian aplikasi belum ada, lebih sedikit yang terhubung SPLP atau di cloud. */
function previousPeriod(current: Aplikasi[], random: () => number): Aplikasi[] {
  const previous = periods.find((p) => p !== activePeriod)!;
  return current
    .filter((a) => a.kepemilikan === "pusat" ? random() < 0.7 : random() < 0.72)
    .map((a) => ({ ...a, period: previous, splp: a.splp && random() < 0.4 ? a.splp : null, cloud: a.cloud && random() < 0.5 ? a.cloud : null }));
}

let cache: Aplikasi[] | undefined;

/** Seluruh aplikasi contoh semua periode (deterministik, dibuat sekali per modul). */
export function allAplikasi() {
  return (cache ??= generate());
}
