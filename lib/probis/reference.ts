import rabReference from "./rab-reference.json";
import { makeRabIndex, type RabNode, type RabSet } from "./rab-index";

/**
 * Data referensi Domain Proses Bisnis (sumber: Detailing Requirement SPBE, sheet "Requirement Landing").
 * Sementara dipakai sebagai master; nanti diganti hasil impor master data.
 */

export type ProbisStatus = "new" | "upgrade" | "as_is";

export const statusOptions: { value: ProbisStatus; label: string }[] = [
  { value: "as_is", label: "AS-IS" },
  { value: "upgrade", label: "Upgrade" },
  { value: "new", label: "Baru" },
];

export const statusLabel: Record<ProbisStatus, string> = { as_is: "AS-IS", upgrade: "Upgrade", new: "Baru" };

/** Label alur verifikasi probis: Bagian Organisasi memverifikasi, Diskominfo memvalidasi. */
export const reviewLabel = {
  draft: "Draf",
  submitted: "Diajukan",
  verified: "Terverifikasi",
  approved: "Tervalidasi",
  rejected: "Dikembalikan",
  archived: "Arsip",
} as const;

/**
 * Periode untuk data contoh saja. Periode sebenarnya dikelola di CMS
 * (Pengaturan › Periode Arsitektur, tabel architecture_periods).
 */
export const samplePeriods = ["2020–2024", "2025–2029"];
export const sampleActivePeriod = "2025–2029";

/** Periode yang dipakai dashboard/form: daftar nama + periode aktif. */
export type PeriodOptions = { periods: string[]; active: string };

export type PerangkatDaerah = { code: string; name: string; total: number; /** Urusan (RAB L2) utama. */ rab2: string[] };

/** 30 Perangkat Daerah dan jumlah probis-nya (total 1.845). */
export const perangkatDaerah: PerangkatDaerah[] = [
  { code: "SETDA", name: "Sekretariat Daerah", total: 153, rab2: ["09.01", "09.02", "09.06", "09.05", "09.07", "05.01"] },
  { code: "DISKOMINFO", name: "Dinas Komunikasi dan Informatika", total: 139, rab2: ["09.03", "09.04", "06.03"] },
  { code: "BKPSDM", name: "Badan Kepegawaian Daerah dan Pengembangan Sumber Daya Manusia", total: 121, rab2: ["09.06"] },
  { code: "DINKES", name: "Dinas Kesehatan", total: 96, rab2: ["04.01"] },
  { code: "DISPENDIK", name: "Dinas Pendidikan", total: 86, rab2: ["06.01"] },
  { code: "DISTAN", name: "Dinas Pertanian", total: 81, rab2: ["02.03", "02.04", "02.05"] },
  { code: "BAKESBANGPOL", name: "Badan Kesatuan Bangsa dan Politik", total: 72, rab2: ["05.02", "09.01"] },
  { code: "DAMKAR", name: "Dinas Pemadam Kebakaran dan Penyelamatan", total: 70, rab2: ["05.02"] },
  { code: "DISPARBUD", name: "Dinas Pariwisata dan Ekonomi Kreatif, Kebudayaan, Kepemudaan, dan Olahraga", total: 65, rab2: ["02.11", "08.02", "06.04", "06.05"] },
  { code: "DISPERPUSIP", name: "Dinas Perpustakaan dan Kearsipan", total: 64, rab2: ["09.03", "08.02"] },
  { code: "DISPERKIM", name: "Dinas Cipta Karya, Perumahan dan Kawasan Permukiman", total: 55, rab2: ["03.04", "03.01"] },
  { code: "DP3AKB", name: "Dinas Keluarga Berencana, Pemberdayaan Perempuan, dan Perlindungan Anak", total: 54, rab2: ["04.03", "03.07"] },
  { code: "KECAMATAN", name: "Kecamatan", total: 53, rab2: ["09.01", "05.02"] },
  { code: "BPPKAD", name: "Badan Pendapatan, Pengelolaan Keuangan dan Aset Daerah", total: 50, rab2: ["09.02"] },
  { code: "DLH", name: "Dinas Lingkungan Hidup", total: 48, rab2: ["07.05"] },
  { code: "DISPENDUKCAPIL", name: "Dinas Kependudukan dan Pencatatan Sipil", total: 48, rab2: ["03.07"] },
  { code: "DISKOPERINDAG", name: "Dinas Koperasi, Usaha Mikro dan Perindag", total: 48, rab2: ["02.09", "02.10", "02.01", "02.02"] },
  { code: "BAPPEDA", name: "Badan Perencanaan, Pembangunan, Penelitian dan Pengembangan Daerah", total: 48, rab2: ["09.05", "06.03"] },
  { code: "DPUTR", name: "Dinas Pekerjaan Umum dan Tata Ruang", total: 47, rab2: ["03.01", "03.06"] },
  { code: "DINSOS", name: "Dinas Sosial", total: 42, rab2: ["04.02"] },
  { code: "DISKAN", name: "Dinas Perikanan", total: 41, rab2: ["02.06", "07.04"] },
  { code: "DISNAKER", name: "Dinas Tenaga Kerja", total: 38, rab2: ["06.02"] },
  { code: "INSPEKTORAT", name: "Inspektorat", total: 33, rab2: ["09.06", "09.02"] },
  { code: "SATPOLPP", name: "Dinas Satpol PP", total: 30, rab2: ["05.01", "05.02"] },
  { code: "DPMPTSP", name: "Dinas Penanaman Modal dan Pelayanan Terpadu Satu Pintu", total: 19, rab2: ["02.08"] },
  { code: "ARSIPDESA", name: "Pelaporan dan Tindak Lanjut Penyimpanan Alih Media Arsip Vital Desa", total: 1, rab2: ["09.03"] },
  { code: "BPBD", name: "Badan Penanggulangan Bencana Daerah", total: 63, rab2: ["05.02"] },
  { code: "DISHUB", name: "Dinas Perhubungan", total: 62, rab2: ["03.03"] },
  { code: "SETWAN", name: "Sekretariat Dewan", total: 59, rab2: ["09.01", "09.02"] },
  { code: "DPMD", name: "Dinas Pemberdayaan Masyarakat dan Desa", total: 59, rab2: ["03.05", "09.01"] },
];

/** 16 sasaran strategis daerah. */
export const sasaranStrategis = [
  "Mewujudkan pemerataan kesejahteraan dan menghapus ketimpangan sosial ekonomi",
  "Mewujudkan kohesi dan harmonisasi sosial dalam kehidupan masyarakat yang berbudaya",
  "Menjamin perlindungan anak dengan pemenuhan hak-hak anak secara inklusif",
  "Meningkatnya kualitas dan aksesibilitas penyelenggaraan layanan dasar pendidikan",
  "Meningkatkan tata kelola pemerintahan yang adaptif dan transparan melalui transformasi digital, penguatan kolaborasi lintas sektor, serta pengelolaan SDM aparatur berbasis sistem merit",
  "Meningkatkan penyerapan tenaga kerja lokal",
  "Meningkatkan kualitas dan aksesibilitas penyelenggaraan layanan dasar kesehatan",
  "Meningkatkan ketangguhan infrastruktur Daerah",
  "Meningkatkan keberdayaan dan kualitas hidup masyarakat secara meluas di berbagai aspek kesejahteraan",
  "Meningkatkan keadilan dan kesetaraan gender serta keberdayaan inklusi sosial dalam pembangunan Daerah dan Desa",
  "Meningkatkan efisiensi dan produktivitas investasi guna memperkuat kinerja ekonomi daerah pada sektor manufaktur dan sektor strategis lainnya yang bernilai tambah tinggi",
  "Meningkatkan daya saing sektor manufaktur berteknologi maju",
  "Meningkatkan akselerasi pembangunan infrastruktur strategis Daerah",
  "Menguatkan kualitas infrastruktur dan konektivitas Daerah yang berdaya saing",
  "Memperluas partisipasi dan inklusifitas perlindungan sosial bagi masyarakat miskin dan kelompok rentan",
  "Memperkuat upaya mitigasi perubahan iklim untuk mendukung pembangunan yang berkelanjutan",
];

/** IKU per sasaran strategis (indeks sama dengan `sasaranStrategis`). */
export const ikuBySasaran = [
  "Indeks Gini",
  "Indeks Pembangunan Kebudayaan",
  "Indeks Perlindungan Anak",
  "Harapan Lama Sekolah",
  "Indeks SPBE",
  "Tingkat Pengangguran Terbuka",
  "Usia Harapan Hidup",
  "Indeks Ketahanan Infrastruktur Daerah",
  "Indeks Pembangunan Manusia",
  "Indeks Pemberdayaan Gender",
  "Pertumbuhan Nilai Investasi",
  "Kontribusi Sektor Manufaktur terhadap PDRB",
  "Persentase Penyelesaian Infrastruktur Strategis",
  "Indeks Konektivitas Daerah",
  "Persentase Penduduk Miskin",
  "Indeks Kualitas Lingkungan Hidup",
];

/** Sasaran yang paling relevan per sektor (RAB L1). */
export const sasaranBySektor: Record<string, number[]> = {
  "01": [1, 4],
  "02": [0, 10, 11],
  "03": [7, 12, 13],
  "04": [6, 2, 14, 9],
  "05": [1, 7],
  "06": [3, 5],
  "07": [15, 8],
  "08": [1, 8],
  "09": [4, 8],
};

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

export const pdByCode = new Map(perangkatDaerah.map((pd) => [pd.code, pd]));
