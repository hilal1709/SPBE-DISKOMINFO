export type Role = "operator_opd" | "organisasi" | "validator_data" | "validator_aplikasi" | "validator_infrastruktur" | "validator_keamanan" | "admin" | "pimpinan" | "superadmin";
export type SubmissionStatus = "draft" | "submitted" | "verified" | "approved" | "rejected" | "archived";
export type RoadmapStatus = "belum_mulai" | "berjalan" | "selesai";
export type Service = { id:string; name:string; opd:string; purpose:string; function:string; rab:string; ral:string; method:string; target:string; benefit:string; risk:string; mitigation:string; processBusiness:string; status:SubmissionStatus; period:string; updatedAt:string };
export type Probis = { id:string; name:string; uraian:string; /** Kode Perangkat Daerah. */ pd:string; status:"new"|"upgrade"|"as_is"; period:string; sasaran:string; iku:string; rab1:string; rab2:string; rab3:string; /** Kode RAB L4/L5 terdaftar (bila ada). */ rab4?:string|null; rab5?:string|null };

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
