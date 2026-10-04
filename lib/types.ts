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
