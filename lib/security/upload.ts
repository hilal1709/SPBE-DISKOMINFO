import { unzipSync, type Unzipped } from "fflate";
import * as XLSX from "xlsx";

/** Batas unggahan template: cegah zip bomb (berkas kecil yang mengembang jadi gigabyte) dan zip bertingkat tanpa akhir. */
const MAX_ENTRIES = 1000;
const MAX_UNCOMPRESSED = 100 * 1024 * 1024;
const MAX_DEPTH = 3;

/** .zip dan .xlsx sama-sama arsip ZIP: diawali "PK\x03\x04". Ekstensi saja bisa dipalsukan. */
export const isZip = (data: Uint8Array) => data.length > 4 && data[0] === 0x50 && data[1] === 0x4b && data[2] === 0x03 && data[3] === 0x04;

/** `unzipSync` dengan batas jumlah entri, total ukuran, dan kedalaman (`path` = lokasi zip ini di dalam unggahan). */
export function unzipSafe(data: Uint8Array, path = ""): Unzipped {
  if ((path.match(/\.zip(\/|$)/gi)?.length ?? 0) >= MAX_DEPTH) throw new Error("Zip bertingkat terlalu dalam.");
  if (!isZip(data)) throw new Error("Berkas bukan arsip .zip yang valid.");
  let entries = 0;
  let total = 0;
  return unzipSync(data, {
    filter(file) {
      if (++entries > MAX_ENTRIES) throw new Error(`Arsip berisi lebih dari ${MAX_ENTRIES} berkas.`);
      total += file.originalSize;
      if (total > MAX_UNCOMPRESSED) throw new Error("Isi arsip terlalu besar (maks. 100 MB setelah diekstrak).");
      return true;
    },
  });
}

/** Baca workbook unggahan: hanya .xlsx (ZIP), tanpa rumus/HTML. */
export function readWorkbook(data: Uint8Array) {
  if (!isZip(data)) throw new Error("Berkas bukan .xlsx yang valid.");
  return XLSX.read(data, { type: "array", cellFormula: false, cellHTML: false });
}
