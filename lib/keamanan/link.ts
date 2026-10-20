import type { Security, SecurityKey } from "@/lib/data/reference";

/**
 * Tautan dependensi Keamanan SPBE (template Data, Aplikasi, Infrastruktur) ke kegiatan keamanan nyata.
 * Kolom `security` menyimpan kode kegiatan (mis. "GSK-KAM AUD.003", unik per periode); isian teks lama dari
 * sebelum modul Keamanan ada tetap disimpan apa adanya.
 */
export type SecurityRef = { code: string; name: string; jenis: SecurityKey; period: string };

const find = (value: string, key: SecurityKey, period: string, refs: SecurityRef[]) => {
  const v = value.trim().toLowerCase();
  const pool = refs.filter((r) => r.period === period && r.jenis === key);
  return pool.find((r) => r.code.toLowerCase() === v || v.startsWith(`${r.code.toLowerCase()} `)) ?? pool.find((r) => r.name.toLowerCase() === v);
};

/** Isian impor (kode, "kode nama", atau nama) → kode kegiatan; yang tidak cocok tetap teks. */
export function resolveSecurity(security: Security, period: string, refs: SecurityRef[]): Security {
  return Object.fromEntries(
    Object.entries(security).map(([key, list]) => [key, [...new Set((list ?? []).map((v) => find(v, key as SecurityKey, period, refs)?.code ?? v))]]),
  );
}

/** Teks tampilan satu isian: "kode nama" bila tertaut, selain itu teks aslinya. */
export function securityLabel(value: string, key: SecurityKey, period: string, refs: SecurityRef[]) {
  const ref = refs.find((r) => r.period === period && r.jenis === key && r.code === value);
  return ref ? `${ref.code} ${ref.name}` : value;
}

/** Ganti isian `security` dengan teks tampilan (untuk ekspor). */
export function withSecurityLabels<T extends { security: Partial<Record<string, string[]>>; period: string }>(rows: T[], refs: SecurityRef[]): T[] {
  return rows.map((r) => ({
    ...r,
    security: Object.fromEntries(Object.entries(r.security).map(([key, list]) => [key, (list ?? []).map((v) => securityLabel(v, key as SecurityKey, r.period, refs))])),
  }));
}
