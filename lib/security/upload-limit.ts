/**
 * Batas unggahan impor. Fungsi Vercel menolak body > 4,5 MB (HTTP 413) sebelum Next.js berjalan, jadi batas 4 MB dipakai
 * di server (assertUploadFile), di serverActions.bodySizeLimit (next.config.ts), dan dicek di browser sebelum mengirim (B10).
 * Modul ini tanpa dependensi agar aman diimpor komponen klien.
 */
export const MAX_UPLOAD_MB = 4;
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
