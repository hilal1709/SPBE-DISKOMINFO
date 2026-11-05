import type { DataInfo } from "@/lib/types";

/**
 * Versi dataset untuk portal publik (S2):
 * - Terbuka tampil penuh.
 * - Terbatas: nama dan wali data tampil, uraian/tujuan/informasi terkait tidak.
 * - Tertutup: hanya ikut dihitung di agregat (sifat, jenis, RAD, wali); nama dan relasi tidak dikirim ke browser.
 */
export function toPublicData(r: DataInfo): DataInfo {
  if (r.sifat === "terbuka") return r;
  const limited = { ...r, uraian: "", tujuan: "", output: null, input: null };
  if (r.sifat === "terbatas") return limited;
  return { ...limited, name: "Data tertutup", probis: [], layanan: [], restricted: true };
}
