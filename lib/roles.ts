import type { BuiltinRole, Role } from "@/lib/types";

export const roleLabel: Record<BuiltinRole, string> = {
  operator_opd: "Operator OPD",
  organisasi: "Tim Verifikasi (Bag. Organisasi)",
  validator_data: "Validator Data",
  validator_aplikasi: "Verifikator Aplikasi (Diskominfo)",
  validator_infrastruktur: "Verifikator Infrastruktur (Diskominfo)",
  validator_keamanan: "Verifikator Keamanan (Diskominfo)",
  operator_diskominfo: "Admin Operator (Diskominfo)",
  admin: "Tim Validasi (Diskominfo)",
  pimpinan: "Pimpinan",
  superadmin: "Superadmin",
};

export const builtinRoles = Object.keys(roleLabel) as BuiltinRole[];
export const isBuiltinRole = (role: Role): role is BuiltinRole => role in roleLabel;

/** Peran untuk pilihan & tampilan (bawaan + kustom). */
export type RoleInfo = { key: Role; label: string; description: string | null; builtin: boolean };

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
