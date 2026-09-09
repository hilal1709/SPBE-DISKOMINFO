export type Role = "operator_opd" | "organisasi" | "validator_data" | "validator_aplikasi" | "validator_infrastruktur" | "validator_keamanan" | "admin" | "pimpinan" | "superadmin";
export type SubmissionStatus = "draft" | "submitted" | "approved" | "rejected" | "archived";
export type RoadmapStatus = "belum_mulai" | "berjalan" | "selesai";
export type Service = { id:string; name:string; opd:string; purpose:string; function:string; rab:string; ral:string; method:string; target:string; benefit:string; risk:string; mitigation:string; processBusiness:string; status:SubmissionStatus; period:string; updatedAt:string };
