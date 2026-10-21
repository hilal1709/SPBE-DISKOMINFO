import { unzipSync, type Unzipped } from "fflate";
import * as XLSX from "xlsx";

/** Batas unggahan template: cegah zip bomb (berkas kecil yang mengembang jadi gigabyte) dan zip bertingkat tanpa akhir. */
const MAX_ENTRIES = 1000;
const MAX_UNCOMPRESSED = 100 * 1024 * 1024;
const MAX_DEPTH = 3;
const MAX_WORKBOOKS = 50;

/**
 * Jatah satu unggahan: jumlah entri, ukuran hasil ekstrak, dan workbook dihitung bersama di semua tingkat zip
 * (bukan per arsip), sehingga zip berisi banyak zip/xlsx kecil yang mengembang tetap dibatasi 100 MB total.
 */
export type UploadBudget = { entries: number; bytes: number; workbooks: number };
export const uploadBudget = (): UploadBudget => ({ entries: 0, bytes: 0, workbooks: 0 });

/** Sama dengan serverActions.bodySizeLimit (next.config.ts); dicek ulang sebelum berkas dibaca ke memori. */
export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

/** Berkas unggahan wajib ada dan tidak melebihi 12 MB. Jenis berkas dicek lewat ekstensi (readUpload) dan magic bytes (isZip). */
export function assertUploadFile(file: FormDataEntryValue | null, empty: string): asserts file is File {
  if (!(file instanceof File) || !file.size) throw new Error(empty);
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("Berkas terlalu besar (maks. 12 MB).");
  if (file.name.length > 255) throw new Error("Nama berkas terlalu panjang.");
}

/** .zip dan .xlsx sama-sama arsip ZIP: diawali "PK\x03\x04". Ekstensi saja bisa dipalsukan. */
export const isZip = (data: Uint8Array) => data.length > 4 && data[0] === 0x50 && data[1] === 0x4b && data[2] === 0x03 && data[3] === 0x04;

/** Hitung entri & ukuran hasil ekstrak dari header ZIP; `extract` false = hanya memeriksa (tidak ada yang diekstrak). */
function unzipCounted(data: Uint8Array, budget: UploadBudget, extract: boolean) {
  return unzipSync(data, {
    filter(file) {
      if (++budget.entries > MAX_ENTRIES) throw new Error(`Arsip berisi lebih dari ${MAX_ENTRIES} berkas.`);
      budget.bytes += file.originalSize;
      if (budget.bytes > MAX_UNCOMPRESSED) throw new Error("Isi arsip terlalu besar (maks. 100 MB setelah diekstrak).");
      return extract;
    },
  });
}

/** `unzipSync` dengan batas jumlah entri, total ukuran, dan kedalaman (`path` = lokasi zip ini di dalam unggahan). */
export function unzipSafe(data: Uint8Array, path = "", budget = uploadBudget()): Unzipped {
  if ((path.match(/\.zip(\/|$)/gi)?.length ?? 0) >= MAX_DEPTH) throw new Error("Zip bertingkat terlalu dalam.");
  if (!isZip(data)) throw new Error("Berkas bukan arsip .zip yang valid.");
  return unzipCounted(data, budget, true);
}

/** Baca workbook unggahan: hanya .xlsx (ZIP), tanpa rumus/HTML. .xlsx juga arsip ZIP, jadi batas zip bomb ikut berlaku. */
export function readWorkbook(data: Uint8Array, budget = uploadBudget()) {
  if (!isZip(data)) throw new Error("Berkas bukan .xlsx yang valid.");
  if (++budget.workbooks > MAX_WORKBOOKS) throw new Error(`Unggahan berisi lebih dari ${MAX_WORKBOOKS} workbook.`);
  unzipCounted(data, budget, false);
  return XLSX.read(data, { type: "array", cellFormula: false, cellHTML: false });
}
