/** Peran bawaan (sheet Functional Requirement). */
export type BuiltinRole = "operator_opd" | "organisasi" | "validator_data" | "validator_aplikasi" | "validator_infrastruktur" | "validator_keamanan" | "operator_diskominfo" | "admin" | "pimpinan" | "superadmin";
/** Peran akun: bawaan atau peran kustom yang dibuat Superadmin di Pengaturan → Hak Akses. */
export type Role = BuiltinRole | (string & {});
export type SubmissionStatus = "draft" | "submitted" | "verified" | "approved" | "rejected" | "archived";
export type Service = { id:string; name:string; opd:string; purpose:string; function:string; rab:string; ral:string; method:string; target:string; benefit:string; risk:string; mitigation:string; processBusiness:string; status:SubmissionStatus; period:string; updatedAt:string };
export type Probis = { id:string; name:string; uraian:string; /** Kode Perangkat Daerah. */ pd:string; status:"new"|"upgrade"|"as_is"; period:string; sasaran:string; iku:string; rab1:string; rab2:string; rab3:string; /** Kode RAB L4/L5 terdaftar (bila ada). */ rab4?:string|null; rab5?:string|null; /** UUID probis bila punya diagram BPMN. */ diagram?:string|null };

/** Probis di CMS (satu baris tabel process_businesses beserta referensinya). */
export type ProbisRecord = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  opdId: string;
  opdCode: string;
  opdName: string;
  period: string;
  probisStatus: Probis["status"];
  status: SubmissionStatus;
  rab1: string | null;
  rab2: string | null;
  rab3: string | null;
  rabL4: string | null;
  rabL5: string | null;
  strategicGoal: string | null;
  iku: string | null;
  ikuTarget: string | null;
  ikuRealization: string | null;
  updatedAt: string;
  /** Data contoh (bisa dihapus massal). */
  isSample: boolean;
  /** RAB perlu dipetakan ulang setelah periodenya pindah versi RAB. */
  rabReview: boolean;
  /** Sudah punya diagram BPMN. */
  hasDiagram: boolean;
};
export type ProbisReview = { id: string; actorName: string | null; fromStatus: SubmissionStatus | null; toStatus: SubmissionStatus; note: string | null; createdAt: string };

/** Layanan di dashboard publik (kolom mengikuti template "Domain Arsitektur Layanan.xlsx"). */
export type Layanan = {
  id: string;
  name: string;
  tujuan: string;
  fungsi: string;
  /** Kode Perangkat Daerah. */
  pd: string;
  unit: string;
  target: "masyarakat" | "usaha" | "asn" | "pemerintah";
  metode: "elektronik" | "hybrid" | "tatap_muka";
  period: string;
  ral1: string;
  ral2: string;
  ral3: string;
  /** Urusan pemerintahan (RAB L2). */
  rab2: string | null;
  manfaat: string | null;
  ekonomi: string | null;
  risiko: string | null;
  mitigasi: string | null;
  /** Kementerian/Lembaga terkait. */
  kl: string | null;
  /** Proses bisnis yang dilayani (dependensi ← Proses Bisnis). */
  probis: { id: string; name: string }[];
};

/** Data & informasi di dashboard publik (kolom mengikuti template "Domain Arsitektur Data dan Informasi.xlsx"). */
export type DataInfo = {
  id: string;
  name: string;
  uraian: string;
  tujuan: string;
  /** Kode PD penghasil/produsen data. */
  produsen: string;
  /** Kode PD penanggung jawab/wali data. */
  wali: string;
  /** Informasi terkait (output/input). */
  output: string | null;
  input: string | null;
  sifat: "terbuka" | "terbatas" | "tertutup";
  jenis: "statistik" | "geopasial" | "keuangan" | "lainnya";
  validitas: string;
  interoperabel: boolean;
  period: string;
  rad1: string;
  rad2: string;
  /** Sebagian RAD L2 tidak memiliki turunan L3. */
  rad3: string | null;
  /** ← Proses bisnis penghasil data. */
  probis: { id: string; name: string }[];
  /** → Layanan pengguna data. */
  layanan: { id: string; name: string }[];
};

/** Aplikasi di dashboard publik (kolom mengikuti template "Domain Arsitektur Aplikasi.xlsx"). */
export type Aplikasi = {
  id: string;
  name: string;
  uraian: string;
  fungsi: string;
  luaran: string;
  /** Mesin basis data (notulen: "nama basis data" → "mesin", mis. PostgreSQL, MySQL). */
  mesin: string | null;
  basis: "web" | "desktop" | "mobile" | "cloud";
  lisensi: "open_source" | "proprietary";
  bahasa: string;
  kerangka: string | null;
  /** ← Unit pengembang: kode PD, atau nama K/L/penyedia. */
  pengembang: string;
  /** Diturunkan dari unit pengembang (tidak ada di template). */
  kepemilikan: "pemda" | "pusat" | "pihak_ketiga";
  /** → Unit operasional teknologi (kode PD). */
  operasional: string;
  period: string;
  raa1: string;
  raa2: string;
  /** → Layanan yang didukung. */
  layanan: { id: string; name: string }[];
  /** ← Proses bisnis terkait; wajib minimal satu (notulen: aplikasi selaras dengan probis). */
  probis: { id: string; name: string; sasaran?: string; iku?: string }[];
  /** → Data yang digunakan (RAD L3/L2). */
  data: { id: string; name: string }[];
  supplier: string | null;
  customer: string | null;
  /** → Dependensi infrastruktur (nama komponen; null = tidak memakai). */
  cloud: string | null;
  server: string | null;
  splp: string | null;
  jip: string | null;
};

/** Aplikasi di CMS (satu baris tabel applications beserta referensinya). Kolom mengikuti template 32 kolom. */
export type AplikasiRecord = Omit<Aplikasi, "id" | "operasional" | "raa1" | "raa2" | "probis"> & {
  id: string;
  code: string;
  /** Unit operasional teknologi (Perangkat Daerah pemilik isian). */
  opdId: string;
  opdCode: string;
  opdName: string;
  status: SubmissionStatus;
  raa1: string | null;
  raa2: string | null;
  /** Null selama RAA belum memiliki Level 3. */
  raa3: string | null;
  raaL4: string | null;
  raaL5: string | null;
  /** Proses bisnis terkait beserta status verifikasinya (wajib minimal satu yang disetujui). */
  probis: { id: string; name: string; status: SubmissionStatus }[];
  /** ← Inputan data / → luaran data: kode data (dipisah baris) atau teks lama. */
  inputData: string | null;
  outputData: string | null;
  /** Nama data untuk kode di inputan/luaran data. */
  dataNames: Record<string, string>;
  /** Dependensi Keamanan SPBE per kunci securityFields: kode kegiatan keamanan (atau teks lama). */
  security: Partial<Record<string, string[]>>;
  updatedAt: string;
  isSample: boolean;
  /** RAA perlu dipetakan ulang setelah periodenya pindah versi RAA. */
  raaReview: boolean;
};

/** Data & informasi di CMS (satu baris tabel datasets beserta referensinya). */
export type DataRecord = {
  id: string;
  code: string;
  name: string;
  uraian: string;
  tujuan: string;
  /** Wali data (Perangkat Daerah pemilik isian). */
  opdId: string;
  opdCode: string;
  opdName: string;
  /** Produsen data: kode PD, atau nama instansi lain. */
  produsen: string | null;
  output: string | null;
  input: string | null;
  sifat: DataInfo["sifat"];
  jenis: DataInfo["jenis"];
  validitas: string;
  interoperabel: boolean;
  period: string;
  status: SubmissionStatus;
  rad1: string | null;
  rad2: string | null;
  /** Null bila RAD L2 tidak memiliki turunan. */
  rad3: string | null;
  radL4: string | null;
  radL5: string | null;
  /** Dependensi Keamanan SPBE per kunci securityFields: kode kegiatan keamanan (atau teks lama). */
  security: Partial<Record<string, string[]>>;
  probis: { id: string; name: string }[];
  layanan: { id: string; name: string }[];
  updatedAt: string;
  isSample: boolean;
  /** RAD perlu dipetakan ulang setelah periodenya pindah versi RAD. */
  radReview: boolean;
};

/** Layanan di CMS (satu baris tabel services beserta referensinya). */
export type LayananRecord = {
  id: string;
  code: string;
  name: string;
  tujuan: string;
  fungsi: string | null;
  unit: string | null;
  opdId: string;
  opdCode: string;
  opdName: string;
  period: string;
  target: Layanan["target"];
  metode: Layanan["metode"];
  status: SubmissionStatus;
  ral1: string | null;
  ral2: string | null;
  ral3: string | null;
  ralL4: string | null;
  ralL5: string | null;
  rab2: string | null;
  manfaat: string | null;
  ekonomi: string | null;
  risiko: string | null;
  mitigasi: string | null;
  kl: string | null;
  probis: { id: string; name: string }[];
  updatedAt: string;
  /** Data contoh (bisa dihapus massal). */
  isSample: boolean;
  /** RAL perlu dipetakan ulang setelah periodenya pindah versi RAL. */
  ralReview: boolean;
};

/** Tautan ringkas ke entri domain lain (kode + nama). */
type InfraLink = { id: string; name: string };

/** Komponen infrastruktur di dashboard publik (10 template "Domain Arsitektur Infrastruktur - *.xlsx"). */
export type Infrastruktur = {
  id: string;
  name: string;
  /** Kunci komponen (lib/infrastruktur/jenis.ts). */
  jenis: "fasilitas" | "cloud" | "server" | "jaringan" | "perangkat_keamanan" | "penyimpanan" | "periferal" | "platform" | "jip" | "splp";
  deskripsi: string | null;
  pemilik: string | null;
  kepemilikan: "milik_sendiri" | "sewa" | "instansi_lain" | "pihak_ketiga" | null;
  /** Unit kerja pengelola / penanggung jawab. */
  pengelola: string | null;
  /** → Instansi (kode PD pemilik isian). */
  opd: string;
  period: string;
  rai1: string;
  rai2: string;
  /** Kolom khusus komponen (kunci di jenisConfig[jenis].attrs). */
  atribut: Record<string, string>;
  /** Komponen infrastruktur lain yang ditautkan (keluar) dan yang menautkan komponen ini (masuk). */
  relasi: (InfraLink & { jenis: Infrastruktur["jenis"] })[];
  terhubung: (InfraLink & { jenis: Infrastruktur["jenis"] })[];
  aplikasi: InfraLink[];
  data: InfraLink[];
  probis: InfraLink[];
  /** Dependensi Keamanan SPBE per kunci securityFields: kode kegiatan keamanan (atau teks lama). */
  security: Partial<Record<string, string[]>>;
};

/** Komponen infrastruktur di CMS (satu baris tabel infrastructures beserta referensinya). */
export type InfrastrukturRecord = Omit<Infrastruktur, "id" | "opd" | "rai1" | "rai2"> & {
  id: string;
  code: string;
  opdId: string;
  opdCode: string;
  opdName: string;
  status: SubmissionStatus;
  rai1: string | null;
  rai2: string | null;
  /** Null selama RAI belum memiliki Level 3. */
  rai3: string | null;
  updatedAt: string;
  isSample: boolean;
  /** RAI perlu dipetakan ulang setelah periodenya pindah versi RAI. */
  raiReview: boolean;
};

/** Kegiatan keamanan di dashboard publik (7 template "Domain Arsitektur Keamanan"). */
export type KegiatanKeamanan = {
  id: string;
  name: string;
  /** Kunci kegiatan (lib/keamanan/jenis.ts), sama dengan kunci securityFields. */
  jenis: "standar" | "edukasi" | "kerentanan" | "peningkatan" | "insiden" | "audit" | "kelaikan";
  deskripsi: string | null;
  /** Tanggal kegiatan / mulai penerapan (YYYY-MM-DD). */
  tanggal: string | null;
  /** → Instansi (kode PD pelaksana). */
  opd: string;
  period: string;
  /** Kolom khusus kegiatan (kunci di kegiatanConfig[jenis].attrs). */
  atribut: Record<string, string>;
};

/** Kegiatan keamanan di CMS (satu baris tabel security_activities). */
export type KeamananRecord = Omit<KegiatanKeamanan, "id" | "opd"> & {
  id: string;
  code: string;
  opdId: string;
  opdCode: string;
  opdName: string;
  status: SubmissionStatus;
  updatedAt: string;
  isSample: boolean;
};

/** Kegiatan Peta Rencana di dashboard publik (target arsitektur per tahun). */
export type Rencana = {
  /** ID kegiatan (GSK-PRN …). */
  id: string;
  /** Nama kegiatan. */
  name: string;
  /** Kode PD pelaksana. */
  opd: string;
  period: string;
  year: number;
  sasaran: string;
  inisiatif: string | null;
  muatan: "aplikasi" | "layanan" | "data" | "infrastruktur" | "keamanan" | "tata_kelola" | "manajemen" | "audit";
  program: string | null;
  target: string | null;
  jumlah: number;
  satuan: string;
  status: "direncanakan" | "berjalan" | "terlaksana" | "ditunda" | "batal";
  realisasi: string | null;
  evaluasi: string | null;
  source: "manual" | "gap" | "usulan_tertunda";
  sourceRef: string | null;
  /** ID kegiatan asal bila dialihkan dari tahun/periode sebelumnya. */
  deferredFrom: string | null;
};

/** Kegiatan Peta Rencana di CMS (satu baris tabel roadmap_items). */
export type RencanaRecord = Omit<Rencana, "id" | "opd"> & {
  id: string;
  code: string;
  opdId: string;
  opdCode: string;
  opdName: string;
  updatedAt: string;
  isSample: boolean;
};

/** Indikator sasaran beserta target per tahun (kunci = tahun). */
export type RencanaIndicator = { id: string; period: string; sasaran: string; inisiatif: string | null; indikator: string; targets: Record<string, string> };

/** Temuan Gap Analysis (satu baris tabel gap_analyses). `rule` null = temuan manual. */
export type GapRecord = {
  id: string;
  code: string;
  period: string;
  opdId: string | null;
  opdName: string | null;
  domain: Rencana["muatan"];
  rule: string | null;
  subjectCode: string | null;
  subjectName: string;
  sasaran: string | null;
  asIs: string;
  target: string;
  rekomendasi: string;
  priority: "tinggi" | "sedang" | "rendah";
  status: "terbuka" | "diusulkan" | "ditindaklanjuti" | "diabaikan";
  note: string | null;
  roadmapId: string | null;
  roadmapCode: string | null;
  roadmapStatus: Rencana["status"] | null;
  updatedAt: string;
  isSample: boolean;
};
