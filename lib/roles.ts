import type { Role } from "@/lib/types";

export const roleLabel: Record<Role, string> = {
  operator_opd: "Operator OPD",
  organisasi: "Tim Verifikasi (Bag. Organisasi)",
  validator_data: "Validator Data",
  validator_aplikasi: "Validator Aplikasi",
  validator_infrastruktur: "Validator Infrastruktur",
  validator_keamanan: "Validator Keamanan",
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
