import type { Role } from "@/lib/types";

export const roleLabel: Record<Role, string> = {
  operator_opd: "Operator OPD",
  organisasi: "Tim Verifikasi (Bag. Organisasi)",
  validator_data: "Validator Data",
  validator_aplikasi: "Verifikator Aplikasi (Diskominfo)",
  validator_infrastruktur: "Verifikator Infrastruktur (Diskominfo)",
  validator_keamanan: "Verifikator Keamanan (Diskominfo)",
  admin: "Tim Validasi (Diskominfo)",
  pimpinan: "Pimpinan",
  superadmin: "Superadmin",
};

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
