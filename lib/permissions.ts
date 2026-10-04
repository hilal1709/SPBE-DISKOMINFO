import type { ProbisRecord, Role, SubmissionStatus } from "@/lib/types";

/** Pengguna yang sedang bertindak di CMS. `id` null untuk mode demo (tanpa sesi). */
export type Actor = { id: string | null; name: string; role: Role; opdId: string | null; demo: boolean };

/** Tahap pemeriksaan: verifikasi (Bagian Organisasi) lalu validasi (Diskominfo). */
export type ReviewStage = "verifikasi" | "validasi";

const editable = new Set(["draft", "rejected"]);
const diskominfoAdmins: Role[] = ["admin", "superadmin"];

/**
 * Hak akses modul Proses Bisnis (sheet Functional Requirement + notulen):
 * operator OPD mengisi data dinasnya, tim verifikasi (Bagian Organisasi) memeriksa ajuan,
 * tim validasi (Diskominfo) memvalidasi akhir, pimpinan hanya melihat.
 */
export const can = {
  readAll: (a: Actor) => a.role !== "operator_opd",
  create: (a: Actor) => a.role === "operator_opd" || diskominfoAdmins.includes(a.role),
  edit: (a: Actor, r: Pick<ProbisRecord, "status"> & { opdId?: string | null }) =>
    a.role === "superadmin" ||
    (editable.has(r.status) && (a.role === "admin" || (a.role === "operator_opd" && !!a.opdId && a.opdId === r.opdId))),
  /** Tim verifikasi: diajukan → terverifikasi / dikembalikan. */
  verify: (a: Actor) => a.role === "organisasi" || a.role === "superadmin",
  /** Tim validasi: terverifikasi → tervalidasi (tayang di portal) / dikembalikan. */
  validate: (a: Actor) => diskominfoAdmins.includes(a.role),
  import: (a: Actor) => a.role === "operator_opd" || diskominfoAdmins.includes(a.role),
  export: (a: Actor) => a.role !== "pimpinan",
  managePeriods: (a: Actor) => diskominfoAdmins.includes(a.role),
  /** Pengelola referensi arsitektur (RAB): tim Diskominfo dan verifikator referensi arsitektur. */
  manageReference: (a: Actor) => diskominfoAdmins.includes(a.role) || a.role === "validator_data",
  /** Operator wajib memilih OPD-nya sendiri; peran lain bebas memilih. */
  lockedOpd: (a: Actor) => (a.role === "operator_opd" ? a.opdId : null),
  /** Boleh bertindak pada tahap ini? */
  review: (a: Actor, stage: ReviewStage) => (stage === "verifikasi" ? can.verify(a) : can.validate(a)),
};

/** Status yang antre di tiap tahap. */
export const stageStatus: Record<ReviewStage, SubmissionStatus> = { verifikasi: "submitted", validasi: "verified" };

/** Tahap pemeriksaan untuk status probis (bila sedang antre). */
export const stageOf = (status: SubmissionStatus): ReviewStage | null =>
  status === "submitted" ? "verifikasi" : status === "verified" ? "validasi" : null;
