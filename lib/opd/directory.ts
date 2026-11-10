import { perangkatDaerah } from "@/lib/probis/reference";

/**
 * Direktori Perangkat Daerah: nama dan keberlakuannya bisa berbeda di tiap periode arsitektur.
 * Modul ini murni (tanpa akses database) agar dipakai server maupun komponen klien.
 */
export type OpdEntry = { code: string; name: string; active: boolean };

export type OpdDirectory = {
  /** Nama dan status pada periode aktif. */
  base: OpdEntry[];
  /** Selisih terhadap `base` per nama periode: kode → [nama, berlaku]. */
  byPeriod: Record<string, Record<string, [name: string, active: boolean]>>;
};

/** Dipakai bila database belum tersedia (data contoh). */
export const fallbackDirectory: OpdDirectory = { base: perangkatDaerah.map((pd) => ({ code: pd.code, name: pd.name, active: true })), byPeriod: {} };

export type OpdBook = ReturnType<typeof opdBook>;

/** `period` kosong atau "__all" berarti periode aktif. */
export function opdBook(directory: OpdDirectory) {
  const base = new Map(directory.base.map((o) => [o.code, o]));
  const entry = (code: string, period?: string | null): OpdEntry | null => {
    const found = base.get(code);
    if (!found) return null;
    const override = period ? directory.byPeriod[period]?.[code] : undefined;
    return override ? { code, name: override[0], active: override[1] } : found;
  };
  const all = (period?: string | null) => directory.base.map((o) => entry(o.code, period)!).sort((a, b) => a.name.localeCompare(b.name, "id"));
  return {
    has: (code: string | null | undefined) => !!code && base.has(code),
    name: (code: string, period?: string | null) => entry(code, period)?.name ?? code,
    /** Semua OPD dengan nama pada periode itu (termasuk yang tidak berlaku), untuk filter daftar. */
    all,
    /** OPD yang berlaku pada periode itu; `keep` tetap disertakan agar rekaman lama bisa dibuka. */
    list: (period?: string | null, keep?: string | null) => all(period).filter((o) => o.active || o.code === keep),
    /** Cocokkan sel impor (kode atau nama, di periode mana pun) ke kode OPD. */
    match(raw: string | null) {
      if (!raw) return null;
      const key = raw.toLowerCase().trim();
      const names = (code: string) => [base.get(code)!.name, ...Object.values(directory.byPeriod).map((p) => p[code]?.[0]).filter((n): n is string => !!n)].map((n) => n.toLowerCase());
      const codes = [...base.keys()];
      return codes.find((code) => code.toLowerCase() === key || names(code).includes(key))
        ?? codes.find((code) => names(code).some((n) => key.includes(n) || n.includes(key)))
        ?? null;
    },
  };
}
