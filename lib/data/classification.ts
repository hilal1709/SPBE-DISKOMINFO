import type { DataInfo } from "@/lib/types";

/** Kata yang menandakan data pribadi/kepegawaian (biasanya bukan data terbuka). */
const PERSONAL = /\b(pensiun|pegawai|asn|pasien|penduduk|nik|pribadi|rekam medis|gaji|penerima|kepegawaian|biodata|identitas)\b/i;

/** Aturan klasifikasi S3 yang ditolak: data tertutup tidak boleh dibagipakaikan. */
export const CLOSED_INTEROP_MESSAGE = "Data tertutup tidak boleh ditandai interoperabel. Ubah sifat data atau set interoperabilitas ke Tidak.";

export const closedInterop = (r: Pick<DataInfo, "sifat" | "interoperabel">) => r.sifat === "tertutup" && r.interoperabel === true;

/** Peringatan klasifikasi untuk ditinjau verifikator (S3), mis. "Data Usul Pensiun" bersifat Terbuka. */
export function classificationWarnings(r: Pick<DataInfo, "name" | "sifat">): string[] {
  return r.sifat === "terbuka" && PERSONAL.test(r.name)
    ? ["Nama data mengandung kata data pribadi/kepegawaian, tetapi sifatnya Terbuka. Pastikan klasifikasinya benar (Terbatas/Tertutup bila memuat data pribadi)."]
    : [];
}
