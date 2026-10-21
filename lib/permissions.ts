import type { RefKind } from "@/lib/reference/versioned";
import type { BuiltinRole, ProbisRecord, Role, SubmissionStatus } from "@/lib/types";

/** Tahap pemeriksaan: verifikasi (Bagian Organisasi) lalu validasi (Diskominfo). */
export type ReviewStage = "verifikasi" | "validasi";

/**
 * Domain arsitektur yang diperiksa. Bagian Organisasi memverifikasi Probis & Layanan; domain Data diverifikasi
 * Diskominfo (Admin Verifikator Referensi Arsitektur & Domain Data), domain Aplikasi, Infrastruktur, dan Keamanan oleh
 * Admin Verifikator masing-masing di Diskominfo — notulen 1 Juli 2026 & Detailing Requirement.
 */
export type ReviewDomain = "probis" | "layanan" | "data" | "aplikasi" | "infrastruktur" | "keamanan";

/** Katalog hak akses yang dapat diatur per peran di Pengaturan → Hak Akses. */
export const permissionCatalog = [
  { group: "Data ajuan", key: "readAll", label: "Lihat data semua OPD", hint: "Tanpa izin ini hanya data OPD sendiri" },
  { group: "Data ajuan", key: "create", label: "Tambah data" },
  { group: "Data ajuan", key: "edit", label: "Ubah ajuan draf atau dikembalikan" },
  { group: "Data ajuan", key: "editAny", label: "Ubah data pada status apa pun" },
  { group: "Data ajuan", key: "import", label: "Impor Excel" },
  { group: "Data ajuan", key: "export", label: "Ekspor data" },
  { group: "Verifikasi", key: "verify.probis", label: "Verifikasi Proses Bisnis" },
  { group: "Verifikasi", key: "verify.layanan", label: "Verifikasi Layanan" },
  { group: "Verifikasi", key: "verify.data", label: "Verifikasi Data" },
  { group: "Verifikasi", key: "verify.aplikasi", label: "Verifikasi Aplikasi" },
  { group: "Verifikasi", key: "verify.infrastruktur", label: "Verifikasi Infrastruktur" },
  { group: "Verifikasi", key: "verify.keamanan", label: "Verifikasi Keamanan" },
  { group: "Verifikasi", key: "validate", label: "Validasi akhir (tayang di portal)" },
  { group: "Referensi", key: "ref.rab", label: "Kelola referensi RAB" },
  { group: "Referensi", key: "ref.ral", label: "Kelola referensi RAL" },
  { group: "Referensi", key: "ref.rad", label: "Kelola referensi RAD" },
  { group: "Referensi", key: "ref.raa", label: "Kelola referensi RAA" },
  { group: "Referensi", key: "ref.rai", label: "Kelola referensi RAI" },
  { group: "Perencanaan", key: "rencana", label: "Kelola gap analysis & peta rencana" },
  { group: "Perencanaan", key: "view.gap", label: "Lihat gap analysis" },
  { group: "Perencanaan", key: "view.keamanan", label: "Lihat dashboard Keamanan" },
  { group: "Pengaturan", key: "periods", label: "Kelola periode arsitektur" },
  { group: "Pengaturan", key: "users", label: "Kelola akun & hak akses" },
] as const;

export type Permission = (typeof permissionCatalog)[number]["key"];
export const allPermissions: Permission[] = permissionCatalog.map((p) => p.key);
export const isPermission = (key: string): key is Permission => (allPermissions as string[]).includes(key);

const except = (...keys: Permission[]) => allPermissions.filter((k) => !keys.includes(k));

/**
 * Hak akses bawaan (sheet Functional Requirement + notulen): operator OPD mengisi data dinasnya, Bagian Organisasi
 * memverifikasi probis & layanan, verifikator Diskominfo memverifikasi domainnya, tim validasi (Diskominfo)
 * memvalidasi akhir, pimpinan hanya melihat. Dipakai bila peran belum diatur di database.
 */
export const defaultGrants: Record<BuiltinRole, Permission[]> = {
  operator_opd: ["create", "edit", "import", "export"],
  organisasi: ["readAll", "verify.probis", "verify.layanan", "export"],
  validator_data: ["readAll", "verify.data", "export", "ref.rab", "ref.ral", "ref.rad", "ref.raa", "ref.rai", "view.gap", "view.keamanan"],
  validator_aplikasi: ["readAll", "verify.aplikasi", "export", "ref.raa", "view.gap", "view.keamanan"],
  validator_infrastruktur: ["readAll", "verify.infrastruktur", "export", "ref.rai", "view.gap", "view.keamanan"],
  validator_keamanan: ["readAll", "verify.keamanan", "export", "view.gap", "view.keamanan"],
  operator_diskominfo: ["readAll", "export", "rencana", "view.gap", "view.keamanan"],
  admin: except("editAny", "verify.probis", "verify.layanan", "verify.data", "verify.aplikasi", "verify.infrastruktur", "verify.keamanan", "users"),
  pimpinan: ["readAll", "view.gap", "view.keamanan"],
  superadmin: allPermissions,
};

/** Hak akses bawaan sebuah peran; peran kustom mulai tanpa izin. */
export const defaultsFor = (role: Role): Permission[] => (role in defaultGrants ? defaultGrants[role as BuiltinRole] : []);

/** Superadmin selalu memegang semua hak akses agar tidak ada yang terkunci di luar CMS. */
export const lockedRole: Role = "superadmin";

/** Pengguna yang sedang bertindak di CMS. `id` null untuk mode demo (tanpa sesi). `perms` & `roleName` dimuat dari peran. */
export type Actor = { id: string | null; name: string; role: Role; roleName: string; opdId: string | null; demo: boolean; perms: Permission[] };

/** Nama tim pemeriksa per domain dan tahap (untuk teks antrean & beranda). */
const verifierTeam: Partial<Record<ReviewDomain, string>> = {
  data: "Verifikator Data Diskominfo",
  aplikasi: "Verifikator Aplikasi Diskominfo",
  infrastruktur: "Verifikator Infrastruktur Diskominfo",
  keamanan: "Verifikator Keamanan Diskominfo",
};
export const reviewTeam = (stage: ReviewStage, domain: ReviewDomain = "probis") =>
  stage === "validasi" ? "Diskominfo" : (verifierTeam[domain] ?? "Bagian Organisasi");

const editable = new Set(["draft", "rejected"]);
const has = (a: Pick<Actor, "perms">, p: Permission) => a.perms.includes(p);

/** Pemeriksaan hak akses CMS; izin per peran diatur di Pengaturan → Hak Akses, aturan per baris (status, OPD) tetap di sini. */
export const can = {
  readAll: (a: Actor) => has(a, "readAll"),
  create: (a: Actor) => has(a, "create"),
  edit: (a: Actor, r: Pick<ProbisRecord, "status"> & { opdId?: string | null }) =>
    has(a, "editAny") || (editable.has(r.status) && has(a, "edit") && (has(a, "readAll") || (!!a.opdId && a.opdId === r.opdId))),
  /** Tim verifikasi: diajukan → terverifikasi / dikembalikan. */
  verify: (a: Actor, domain: ReviewDomain = "probis") => has(a, `verify.${domain}`),
  /** Tim validasi: terverifikasi → tervalidasi (tayang di portal) / dikembalikan. */
  validate: (a: Actor) => has(a, "validate"),
  import: (a: Actor) => has(a, "import"),
  export: (a: Actor) => has(a, "export"),
  managePeriods: (a: Actor) => has(a, "periods"),
  /** Pengelola referensi arsitektur per jenis; tanpa jenis = salah satu referensi. */
  manageReference: (a: Actor, kind?: RefKind) => (kind ? has(a, `ref.${kind}`) : a.perms.some((p) => p.startsWith("ref."))),
  /** Dashboard Keamanan (wajib login). */
  viewKeamanan: (a: Actor) => has(a, "view.keamanan"),
  /** Pengelola gap analysis & peta rencana. */
  manageRencana: (a: Actor) => has(a, "rencana"),
  /** Gap Analysis berisi penilaian internal. */
  viewGap: (a: Actor) => has(a, "view.gap"),
  manageUsers: (a: Actor) => has(a, "users"),
  /** Tanpa akses semua OPD, pengguna wajib memilih OPD-nya sendiri. */
  lockedOpd: (a: Actor) => (has(a, "readAll") ? null : a.opdId),
  /** Boleh bertindak pada tahap ini? */
  review: (a: Actor, stage: ReviewStage, domain: ReviewDomain = "probis") => (stage === "verifikasi" ? can.verify(a, domain) : can.validate(a)),
};

/** Status yang antre di tiap tahap. */
export const stageStatus: Record<ReviewStage, SubmissionStatus> = { verifikasi: "submitted", validasi: "verified" };

/** Tahap pemeriksaan untuk status probis (bila sedang antre). */
export const stageOf = (status: SubmissionStatus): ReviewStage | null =>
  status === "submitted" ? "verifikasi" : status === "verified" ? "validasi" : null;
