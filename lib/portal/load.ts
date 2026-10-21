import { sampleActivePeriod, samplePeriods } from "@/lib/probis/reference";

/** Pilihan periode bawaan saat dashboard memakai data contoh. */
export const samplePeriodOptions = { periods: samplePeriods, active: sampleActivePeriod };

/**
 * Baca data tervalidasi untuk dashboard portal. Bila database tidak terjangkau, kembalikan `null`
 * agar halaman tetap tampil dengan data contoh bawaan.
 */
export async function readApproved<T>(domain: string, read: () => Promise<T>): Promise<T | null> {
  try {
    return await read();
  } catch (error) {
    console.warn(`Dashboard ${domain} memakai data contoh bawaan:`, error instanceof Error ? error.message : error);
    return null;
  }
}
