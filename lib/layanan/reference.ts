import { makeRabIndex, type RabNode } from "@/lib/probis/rab-index";
import ralReference from "./ral-reference.json";

/**
 * Referensi Domain Layanan (sumber: template analis "Domain Arsitektur Layanan.xlsx").
 * RAL disimpan sebagai node berbentuk RabNode agar indeksnya memakai makeRabIndex.
 */
export const sampleRal = makeRabIndex(ralReference as RabNode[]);

export type Target = "masyarakat" | "usaha" | "asn" | "pemerintah";
export const targetOptions: { value: Target; label: string }[] = [
  { value: "masyarakat", label: "Masyarakat" },
  { value: "usaha", label: "Pelaku Usaha" },
  { value: "asn", label: "ASN/Pegawai" },
  { value: "pemerintah", label: "Pemerintah" },
];
export const targetLabel = Object.fromEntries(targetOptions.map((o) => [o.value, o.label])) as Record<Target, string>;

export type Metode = "elektronik" | "hybrid" | "tatap_muka";
export const metodeOptions: { value: Metode; label: string }[] = [
  { value: "elektronik", label: "Elektronik" },
  { value: "hybrid", label: "Hybrid" },
  { value: "tatap_muka", label: "Tatap muka" },
];
export const metodeLabel = Object.fromEntries(metodeOptions.map((o) => [o.value, o.label])) as Record<Metode, string>;
/** Layanan terdigitalisasi = metode Elektronik atau Hybrid (tidak ada kolom tersendiri di template). */
export const isDigital = (metode: Metode) => metode !== "tatap_muka";

/** RAL 1: layanan publik vs administrasi pemerintahan. */
export const RAL_PUBLIK = "RAL.01";

/** Urusan RAB L2 → RAL L2 (nama urusan sama di kedua referensi). */
export function ralForRab2(rab2: string, rab: { byCode: Map<string, RabNode> }) {
  const name = rab.byCode.get(rab2)?.name.toLowerCase();
  return sampleRal.nodes.find((n) => n.level === 2 && n.name.toLowerCase() === name)?.code;
}

/** Kementerian/Lembaga pembina per RAL L2 (untuk data contoh). */
export const kementerianByRal2: Record<string, string> = {
  "RAL.01.05": "Kementerian Perindustrian",
  "RAL.01.06": "Kementerian Perdagangan",
  "RAL.01.07": "Kementerian Pertanian",
  "RAL.01.08": "Kementerian Pertanian",
  "RAL.01.09": "Kementerian Pertanian",
  "RAL.01.10": "Kementerian Kelautan dan Perikanan",
  "RAL.01.12": "Kementerian Investasi/BKPM",
  "RAL.01.13": "Kementerian Koperasi",
  "RAL.01.14": "Kementerian UMKM",
  "RAL.01.15": "Kementerian Pariwisata",
  "RAL.01.17": "Kementerian Pekerjaan Umum",
  "RAL.01.19": "Kementerian Perhubungan",
  "RAL.01.20": "Kementerian Perumahan dan Kawasan Permukiman",
  "RAL.01.21": "Kementerian Desa dan Pembangunan Daerah Tertinggal",
  "RAL.01.22": "Kementerian ATR/BPN",
  "RAL.01.23": "Kementerian Dalam Negeri",
  "RAL.01.25": "Kementerian Kesehatan",
  "RAL.01.26": "Kementerian Sosial",
  "RAL.01.27": "Kementerian PPPA",
  "RAL.01.28": "Kementerian Hukum",
  "RAL.01.29": "Badan Nasional Penanggulangan Bencana",
  "RAL.01.31": "Kementerian Pendidikan Dasar dan Menengah",
  "RAL.01.32": "Kementerian Ketenagakerjaan",
  "RAL.01.33": "Badan Riset dan Inovasi Nasional",
  "RAL.01.34": "Kementerian Pemuda dan Olahraga",
  "RAL.01.35": "Kementerian Pemuda dan Olahraga",
  "RAL.01.39": "Kementerian Kelautan dan Perikanan",
  "RAL.01.40": "Kementerian Lingkungan Hidup",
  "RAL.01.42": "Kementerian Kebudayaan",
  "RAL.01.43": "Kementerian Komunikasi dan Digital",
  "RAL.01.44": "Kementerian Komunikasi dan Digital",
  "RAL.02.01": "Kementerian Dalam Negeri",
  "RAL.02.02": "Kementerian Keuangan",
  "RAL.02.03": "Kementerian PPN/Bappenas",
  "RAL.02.04": "Kementerian PANRB",
  "RAL.02.05": "Kementerian Sekretariat Negara",
};

/** Nama layanan contoh per RAL L2 beserta target utamanya. */
export const layananByRal2: Record<string, [string, Target][]> = {
  "RAL.01.05": [["Pendampingan Sertifikasi Industri Kecil", "usaha"], ["Fasilitasi Kemitraan Industri", "usaha"], ["Pendaftaran Data Industri", "usaha"]],
  "RAL.01.06": [["Tera dan Tera Ulang Alat Ukur", "usaha"], ["Informasi Harga Bahan Pokok", "masyarakat"], ["Pengelolaan Pasar Rakyat", "usaha"], ["Penerbitan Tanda Daftar Gudang", "usaha"]],
  "RAL.01.07": [["Penyuluhan Pertanian", "masyarakat"], ["Distribusi Pupuk Bersubsidi", "masyarakat"], ["Klinik Tanaman", "masyarakat"], ["Pendaftaran Kelompok Tani", "masyarakat"], ["Bantuan Alat dan Mesin Pertanian", "masyarakat"]],
  "RAL.01.08": [["Pembinaan Kebun Rakyat", "masyarakat"], ["Sertifikasi Benih Perkebunan", "usaha"]],
  "RAL.01.09": [["Pelayanan Kesehatan Hewan", "masyarakat"], ["Inseminasi Buatan Ternak", "masyarakat"], ["Rekomendasi Pemasukan Ternak", "usaha"]],
  "RAL.01.10": [["Kartu Pelaku Usaha Kelautan dan Perikanan", "usaha"], ["Penyuluhan Perikanan", "masyarakat"], ["Bantuan Benih Ikan", "masyarakat"]],
  "RAL.01.12": [["Konsultasi Penanaman Modal", "usaha"], ["Promosi Peluang Investasi", "usaha"], ["Laporan Kegiatan Penanaman Modal", "usaha"]],
  "RAL.01.13": [["Pengesahan Akta Koperasi", "usaha"], ["Pembinaan Koperasi", "usaha"], ["Penilaian Kesehatan Koperasi", "usaha"]],
  "RAL.01.14": [["Pendampingan UMKM Naik Kelas", "usaha"], ["Kurasi Produk UMKM", "usaha"], ["Fasilitasi Sertifikasi Halal", "usaha"]],
  "RAL.01.15": [["Informasi Destinasi Wisata", "masyarakat"], ["Pendaftaran Usaha Pariwisata", "usaha"], ["Fasilitasi Ekonomi Kreatif", "usaha"]],
  "RAL.01.17": [["Pengaduan Jalan dan Jembatan Rusak", "masyarakat"], ["Rekomendasi Teknis Pemanfaatan Jalan", "usaha"], ["Uji Mutu Bahan Konstruksi", "usaha"], ["Penerbitan Persetujuan Bangunan Gedung", "masyarakat"]],
  "RAL.01.19": [["Pengujian Kendaraan Bermotor", "masyarakat"], ["Izin Trayek Angkutan", "usaha"], ["Penerbitan Andalalin", "usaha"], ["Layanan Parkir Tepi Jalan", "masyarakat"]],
  "RAL.01.20": [["Bantuan Rumah Tidak Layak Huni", "masyarakat"], ["Penyerahan PSU Perumahan", "usaha"], ["Pendataan Kawasan Kumuh", "pemerintah"]],
  "RAL.01.21": [["Pendampingan Desa Mandiri", "pemerintah"], ["Fasilitasi BUMDes", "masyarakat"], ["Pembinaan Lembaga Kemasyarakatan Desa", "masyarakat"]],
  "RAL.01.22": [["Informasi Tata Ruang", "masyarakat"], ["Fasilitasi Pengadaan Tanah", "pemerintah"]],
  "RAL.01.23": [["Penerbitan KTP Elektronik", "masyarakat"], ["Penerbitan Kartu Keluarga", "masyarakat"], ["Penerbitan Akta Kelahiran", "masyarakat"], ["Penerbitan Akta Kematian", "masyarakat"], ["Identitas Kependudukan Digital", "masyarakat"], ["Pelayanan KB", "masyarakat"]],
  "RAL.01.25": [["Pendaftaran Pasien Puskesmas", "masyarakat"], ["Rujukan Terintegrasi", "masyarakat"], ["Imunisasi Anak", "masyarakat"], ["Penerbitan Izin Praktik Tenaga Kesehatan", "usaha"], ["Surveilans Penyakit Menular", "pemerintah"], ["Ambulans Gawat Darurat", "masyarakat"]],
  "RAL.01.26": [["Pengusulan Data Terpadu Kesejahteraan Sosial", "masyarakat"], ["Rehabilitasi Sosial", "masyarakat"], ["Bantuan Sosial Lansia", "masyarakat"], ["Rekomendasi Pengumpulan Uang dan Barang", "masyarakat"]],
  "RAL.01.27": [["Pengaduan Kekerasan Perempuan dan Anak", "masyarakat"], ["Konseling Keluarga", "masyarakat"], ["Pendampingan Korban Kekerasan", "masyarakat"]],
  "RAL.01.28": [["Penegakan Peraturan Daerah", "masyarakat"], ["Konsultasi Produk Hukum Daerah", "pemerintah"], ["Jaringan Dokumentasi dan Informasi Hukum", "masyarakat"]],
  "RAL.01.29": [["Penanganan Kebakaran", "masyarakat"], ["Peringatan Dini Bencana", "masyarakat"], ["Evakuasi dan Penyelamatan", "masyarakat"], ["Pemeriksaan Proteksi Kebakaran Gedung", "usaha"], ["Surat Keterangan Terdaftar Ormas", "masyarakat"]],
  "RAL.01.31": [["Penerimaan Peserta Didik Baru", "masyarakat"], ["Legalisasi Ijazah", "masyarakat"], ["Beasiswa Pendidikan", "masyarakat"], ["Izin Pendirian Satuan Pendidikan", "usaha"], ["Mutasi Peserta Didik", "masyarakat"]],
  "RAL.01.32": [["Kartu Pencari Kerja", "masyarakat"], ["Pelatihan Kerja", "masyarakat"], ["Pencatatan Perjanjian Kerja Bersama", "usaha"], ["Mediasi Hubungan Industrial", "usaha"]],
  "RAL.01.33": [["Rekomendasi Izin Penelitian", "masyarakat"], ["Inkubasi Inovasi Daerah", "masyarakat"]],
  "RAL.01.34": [["Pembinaan Organisasi Kepemudaan", "masyarakat"], ["Pemuda Pelopor", "masyarakat"]],
  "RAL.01.35": [["Peminjaman Fasilitas Olahraga", "masyarakat"], ["Pembinaan Atlet Berprestasi", "masyarakat"]],
  "RAL.01.39": [["Pengelolaan Tempat Pelelangan Ikan", "usaha"], ["Pemberdayaan Nelayan Kecil", "masyarakat"]],
  "RAL.01.40": [["Persetujuan Lingkungan", "usaha"], ["Pengaduan Pencemaran Lingkungan", "masyarakat"], ["Pengangkutan Sampah", "masyarakat"], ["Uji Laboratorium Lingkungan", "usaha"]],
  "RAL.01.42": [["Pendaftaran Cagar Budaya", "masyarakat"], ["Fasilitasi Sanggar Seni", "masyarakat"], ["Perpustakaan Digital", "masyarakat"]],
  "RAL.01.43": [["Permohonan Informasi Publik", "masyarakat"], ["Portal Satu Data", "masyarakat"], ["Peminjaman Arsip Statis", "masyarakat"], ["Layanan Perpustakaan Keliling", "masyarakat"]],
  "RAL.01.44": [["Pengaduan Masyarakat Terpadu", "masyarakat"], ["Diseminasi Informasi Publik", "masyarakat"], ["Penyediaan Akses Internet Publik", "masyarakat"], ["Pengelolaan Nama Domain", "pemerintah"]],
  "RAL.02.01": [["Fasilitasi Penyelenggaraan Pemerintahan Desa", "pemerintah"], ["Evaluasi Rancangan Peraturan Desa", "pemerintah"], ["Pelayanan Administrasi Terpadu Kecamatan", "masyarakat"]],
  "RAL.02.02": [["Pengajuan Surat Perintah Pencairan Dana", "pemerintah"], ["Pembayaran Pajak Daerah", "masyarakat"], ["Pengelolaan Barang Milik Daerah", "pemerintah"], ["Penatausahaan Keuangan Perangkat Daerah", "pemerintah"]],
  "RAL.02.03": [["Musrenbang Daring", "masyarakat"], ["Penyusunan Rencana Kerja Perangkat Daerah", "pemerintah"], ["Evaluasi Capaian Pembangunan", "pemerintah"]],
  "RAL.02.04": [["Cuti Pegawai ASN", "asn"], ["Kenaikan Pangkat", "asn"], ["Kenaikan Gaji Berkala", "asn"], ["Pengelolaan Kinerja Pegawai", "asn"], ["Presensi Pegawai", "asn"], ["Usul Pensiun", "asn"], ["Pengembangan Kompetensi ASN", "asn"], ["Pengelolaan Arsip Dinamis", "pemerintah"]],
  "RAL.02.05": [["Fasilitasi Rapat Pimpinan", "pemerintah"], ["Pengelolaan Protokol dan Kunjungan", "pemerintah"]],
};

/** Contoh potensi manfaat, ekonomi, dan risiko per target. */
export const manfaatByTarget: Record<Target, string[]> = {
  masyarakat: ["Waktu pengurusan lebih singkat dan biaya perjalanan berkurang", "Masyarakat memperoleh layanan yang mudah diakses dan transparan", "Status permohonan dapat dipantau tanpa datang ke kantor"],
  usaha: ["Kepastian waktu dan persyaratan bagi pelaku usaha", "Proses berusaha lebih cepat sehingga iklim investasi membaik", "Pelaku usaha terhubung dengan program pembinaan daerah"],
  asn: ["Administrasi kepegawaian lebih cepat dan tertib", "Data pegawai mutakhir dan dapat dipakai lintas layanan", "Beban kerja administratif berkurang"],
  pemerintah: ["Koordinasi antar Perangkat Daerah lebih efektif", "Pengambilan keputusan berbasis data yang akurat", "Akuntabilitas kinerja meningkat"],
};

export const ekonomiByTarget: Record<Target, string[]> = {
  masyarakat: ["Penghematan biaya transportasi dan waktu kerja warga", "Mendorong partisipasi ekonomi keluarga"],
  usaha: ["Meningkatkan realisasi investasi dan penyerapan tenaga kerja", "Menambah pendapatan asli daerah dari sektor usaha"],
  asn: ["Efisiensi belanja operasional kepegawaian", "Produktivitas aparatur meningkat"],
  pemerintah: ["Efisiensi belanja daerah", "Pengurangan duplikasi kegiatan antar Perangkat Daerah"],
};

export const risikoMitigasi: [string, string][] = [
  ["Gangguan jaringan atau sistem saat jam layanan", "Menyediakan kanal layanan alternatif dan pemantauan sistem berkala"],
  ["Kebocoran data pribadi pemohon", "Menerapkan enkripsi, pembatasan hak akses, dan audit keamanan informasi"],
  ["Keterbatasan SDM pelaksana layanan", "Pelatihan petugas dan penyusunan SOP yang terdokumentasi"],
  ["Rendahnya literasi digital pengguna layanan", "Sosialisasi rutin dan pendampingan di loket layanan"],
  ["Data antar sistem tidak sinkron", "Integrasi melalui Sistem Penghubung Layanan dan Satu Data"],
  ["Penumpukan antrean pada periode tertentu", "Penjadwalan daring dan penambahan loket saat periode puncak"],
];

export const unitPelaksana = ["Sekretariat", "Bidang Pelayanan", "Bidang Teknis", "UPT", "Mal Pelayanan Publik", "Bidang Pembinaan"];
