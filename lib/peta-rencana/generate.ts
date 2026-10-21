import { mulberry32 } from "@/lib/probis/generate";
import { ikuBySasaran, sampleActivePeriod as activePeriod, samplePeriods as periods, sasaranStrategis } from "@/lib/probis/reference";
import type { Rencana, RencanaIndicator } from "@/lib/types";
import { muatanConfig, type Muatan } from "./muatan";
import { inisiatifBySasaran } from "./sasaran";

/** Data contoh Peta Rencana (dashboard publik saat database kosong, dan `pnpm seed:peta-rencana`). */

/** Program per sasaran: [muatan, nama program, objek kegiatan, PD pelaksana]. */
type Program = [Muatan, string, string, string[]];
const programs: Program[][] = [
  [["aplikasi", "Pengembangan Aplikasi Bantuan Sosial", "Aplikasi Bansos Terpadu", ["DINSOS", "DISKOMINFO"]], ["data", "Satu Data Kesejahteraan", "Basis Data Penerima Bantuan", ["DINSOS", "BAPPEDA"]]],
  [["layanan", "Digitalisasi Layanan Kebudayaan", "Layanan Cagar Budaya Daring", ["DISPARBUD"]], ["aplikasi", "Pengembangan Aplikasi Kebudayaan", "Aplikasi Kalender Budaya", ["DISPARBUD", "DISKOMINFO"]]],
  [["aplikasi", "Pengembangan Sistem Perlindungan Anak", "Aplikasi Pelaporan Kekerasan Anak", ["DP3AKB"]], ["data", "Integrasi Data Anak", "Basis Data Anak Terpadu", ["DP3AKB", "DISPENDUKCAPIL"]]],
  [["aplikasi", "Integrasi Aplikasi pada Portal layanan.gresikkab.go.id", "Integrasi Aplikasi SPMB SD dan SMP", ["DISKOMINFO", "DISPENDIK"]], ["aplikasi", "Pembangunan & Pengembangan Aplikasi Pendidikan Terpadu", "Aplikasi e-LIBRARY", ["DISPERPUSIP"]], ["data", "Pembangunan Dashboard Pendidikan Terpadu", "Dashboard IKU Pendidikan", ["DISKOMINFO", "DISPENDIK"]]],
  [["manajemen", "Manajemen SPBE", "Manajemen Risiko SPBE", ["DISKOMINFO"]], ["manajemen", "Manajemen Pengetahuan SPBE", "Repositori Pengetahuan SPBE", ["DISKOMINFO", "BKPSDM"]], ["tata_kelola", "Penguatan Tata Kelola SPBE", "Kebijakan Internal Arsitektur SPBE", ["DISKOMINFO", "SETDA"]], ["audit", "Audit TIK", "Audit Aplikasi dan Infrastruktur SPBE", ["INSPEKTORAT", "DISKOMINFO"]], ["infrastruktur", "Penguatan Pusat Data Daerah", "Pusat Data dan Pemulihan Bencana", ["DISKOMINFO"]], ["keamanan", "Penguatan Keamanan Informasi", "Security Operation Center", ["DISKOMINFO"]], ["layanan", "Layanan Kepegawaian Digital", "Layanan Kepegawaian Berbasis Merit", ["BKPSDM"]]],
  [["aplikasi", "Pengembangan Bursa Kerja Daring", "Aplikasi Bursa Kerja Gresik", ["DISNAKER"]], ["layanan", "Layanan Pelatihan Kerja", "Pendaftaran Pelatihan Kerja Daring", ["DISNAKER"]]],
  [["aplikasi", "Pengembangan Sistem Informasi Kesehatan", "Rekam Medis Elektronik Puskesmas", ["DINKES"]], ["infrastruktur", "Jaringan Fasilitas Kesehatan", "Jaringan Intra Puskesmas", ["DINKES", "DISKOMINFO"]], ["layanan", "Layanan Kesehatan Daring", "Antrean Puskesmas Daring", ["DINKES"]]],
  [["infrastruktur", "Ketangguhan Infrastruktur Kebencanaan", "Sistem Peringatan Dini Bencana", ["BPBD", "DISKOMINFO"]], ["aplikasi", "Pengembangan Aplikasi Kebencanaan", "Aplikasi Pelaporan Kejadian Bencana", ["BPBD", "DAMKAR"]]],
  [["layanan", "Digitalisasi Layanan Desa", "Layanan Administrasi Desa Daring", ["DPMD", "KECAMATAN"]], ["aplikasi", "Pengembangan Sistem Informasi Desa", "Aplikasi Profil Desa", ["DPMD"]]],
  [["aplikasi", "Pengembangan Sistem Pemberdayaan Perempuan", "Aplikasi Data Gender dan Anak", ["DP3AKB"]], ["data", "Satu Data Gender", "Basis Data Gender Terpilah", ["DP3AKB", "BAPPEDA"]]],
  [["layanan", "Perizinan Berusaha Terintegrasi", "Integrasi Perizinan dengan OSS", ["DPMPTSP"]], ["aplikasi", "Pengembangan Sistem Investasi", "Aplikasi Peta Peluang Investasi", ["DPMPTSP", "BAPPEDA"]]],
  [["aplikasi", "Pengembangan Sistem Informasi Industri", "Aplikasi Data Industri Manufaktur", ["DISKOPERINDAG"]]],
  [["infrastruktur", "Pemantauan Proyek Strategis", "Sistem Pemantauan Proyek Fisik", ["DPUTR", "BAPPEDA"]], ["aplikasi", "Pengembangan Sistem Tata Ruang", "Aplikasi Informasi Tata Ruang", ["DPUTR"]]],
  [["infrastruktur", "Perluasan Jaringan Intra Pemerintah", "Jaringan Fiber Optik Kecamatan", ["DISKOMINFO", "KECAMATAN"]], ["aplikasi", "Pengembangan Sistem Transportasi", "Aplikasi Informasi Angkutan Umum", ["DISHUB"]]],
  [["data", "Pemutakhiran Data Kemiskinan", "Data Terpadu Kesejahteraan Sosial", ["DINSOS", "DISPENDUKCAPIL"]], ["layanan", "Layanan Pengaduan Sosial", "Kanal Pengaduan Sosial Terpadu", ["DINSOS"]]],
  [["infrastruktur", "Pemantauan Kualitas Lingkungan", "Sensor Kualitas Udara dan Air", ["DLH", "DISKOMINFO"]], ["aplikasi", "Pengembangan Sistem Lingkungan", "Aplikasi Pengelolaan Sampah", ["DLH"]]],
];

/** Tahapan kegiatan dalam satu program (urut tahun). */
const stages: Record<Muatan, string[]> = {
  aplikasi: ["Pembangunan", "Pengembangan", "Integrasi", "Pemeliharaan", "Pemeliharaan"],
  layanan: ["Perancangan", "Penerapan", "Perluasan", "Evaluasi", "Evaluasi"],
  data: ["Penyusunan", "Pengumpulan", "Integrasi", "Pemutakhiran", "Pemutakhiran"],
  infrastruktur: ["Pengadaan", "Pembangunan", "Perluasan", "Pemeliharaan", "Pemeliharaan"],
  keamanan: ["Penyusunan Kebijakan", "Penerapan", "Uji Kerentanan", "Penguatan", "Evaluasi"],
  tata_kelola: ["Penyusunan", "Penetapan", "Sosialisasi", "Evaluasi", "Reviu"],
  manajemen: ["Penyusunan", "Penerapan", "Pemantauan", "Evaluasi", "Reviu"],
  audit: ["Perencanaan", "Pelaksanaan", "Tindak Lanjut", "Pelaksanaan", "Tindak Lanjut"],
};

const targets: Record<Muatan, string> = {
  aplikasi: "Aplikasi berjalan dan terintegrasi portal layanan",
  layanan: "Layanan tersedia secara elektronik",
  data: "Data tersedia di portal Satu Data",
  infrastruktur: "Infrastruktur beroperasi sesuai standar",
  keamanan: "Kontrol keamanan diterapkan",
  tata_kelola: "Dokumen ditetapkan dan diterapkan",
  manajemen: "Proses manajemen berjalan berkala",
  audit: "Laporan audit dan tindak lanjut",
};

/** Batas tanggal data contoh (tetap, agar deterministik). */
const CURRENT_YEAR = 2026;

function generate() {
  const random = mulberry32(3011);
  const rows: Rencana[] = [];
  for (const period of periods) {
    const [start, end] = period.split("–").map(Number) as [number, number];
    const seq = new Map<Muatan, number>();
    const code = (muatan: Muatan) => {
      const n = (seq.get(muatan) ?? 0) + 1;
      seq.set(muatan, n);
      return `GSK-PRN ${muatanConfig[muatan].abbr}.${String(n).padStart(3, "0")}`;
    };
    programs.forEach((list, s) =>
      list.forEach(([muatan, program, object, opds]) => {
        // Periode lama memuat sebagian program saja.
        if (period !== activePeriod && random() < 0.45) return;
        const first = start + Math.floor(random() * 2);
        for (let year = first, step = 0; year <= end; year++, step++) {
          if (step > 0 && random() < 0.18) continue;
          const opd = opds[step === 0 ? 0 : Math.floor(random() * opds.length)]!;
          const past = year < CURRENT_YEAR;
          const now = year === CURRENT_YEAR;
          const roll = random();
          const status: Rencana["status"] = past
            ? roll < 0.78 ? "terlaksana" : roll < 0.93 ? "ditunda" : "batal"
            : now
              ? roll < 0.35 ? "terlaksana" : roll < 0.85 ? "berjalan" : "ditunda"
              : "direncanakan";
          const name = `${stages[muatan][Math.min(step, 4)]} ${object}`;
          const item: Rencana = {
            id: code(muatan),
            name,
            opd,
            period,
            year,
            sasaran: sasaranStrategis[s]!,
            inisiatif: inisiatifBySasaran[s]!,
            muatan,
            program,
            target: targets[muatan],
            jumlah: 1,
            satuan: "Kegiatan",
            status,
            realisasi: status === "terlaksana" ? `${name} selesai ${random() < 0.7 ? "tepat waktu" : "dengan penyesuaian anggaran"}` : status === "berjalan" ? `Progres ${30 + Math.round(random() * 50)}%` : null,
            evaluasi:
              status === "ditunda" ? "Anggaran belum tersedia pada tahun berjalan" : status === "batal" ? "Digantikan aplikasi nasional" : status === "terlaksana" && random() < 0.4 ? "Perlu pendampingan pengguna OPD" : null,
            source: random() < 0.25 ? "gap" : "manual",
            sourceRef: null,
            deferredFrom: null,
          };
          rows.push(item);
          // Kegiatan tertunda dialihkan ke tahun berikutnya bila masih di dalam periode.
          if (status === "ditunda" && year < end)
            rows.push({ ...item, id: code(muatan), year: year + 1, status: year + 1 <= CURRENT_YEAR ? "berjalan" : "direncanakan", realisasi: null, evaluasi: null, source: "usulan_tertunda", sourceRef: item.id, deferredFrom: item.id });
        }
      }),
    );
  }
  return rows;
}

/** Indikator sasaran & target per tahun (IKU tiap sasaran, naik bertahap). */
function indicators(): RencanaIndicator[] {
  const random = mulberry32(3019);
  return periods.flatMap((period) => {
    const [start, end] = period.split("–").map(Number) as [number, number];
    return sasaranStrategis.map((sasaran, i) => {
      const base = 50 + random() * 30;
      const step = 0.5 + random() * 2;
      return {
        id: `IND-${period}-${i}`,
        period,
        sasaran,
        inisiatif: inisiatifBySasaran[i]!,
        indikator: ikuBySasaran[i]!,
        targets: Object.fromEntries(Array.from({ length: end - start + 1 }, (_, k) => [String(start + k), (base + step * k).toFixed(2).replace(".", ",")])),
      };
    });
  });
}

let cache: { rows: Rencana[]; indicators: RencanaIndicator[] } | null = null;
/** Semua kegiatan & indikator contoh (kedua periode). */
export function allRencana() {
  return (cache ??= { rows: generate(), indicators: indicators() });
}
