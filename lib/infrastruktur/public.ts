import type { Infrastruktur } from "@/lib/types";
import { jenisConfig } from "./jenis";

/**
 * Kolom khusus yang aman tampil publik: hanya angka kapasitas (untuk agregat), jenis lisensi, dan jenis penggunaan server.
 * Versi OS/basis data, lokasi ruang server, tipe perangkat keamanan, nama VPN, dsb. hanya tersedia setelah login.
 */
const PUBLIC_ATTRS = new Set(["lisensi", "penggunaan"]);

/**
 * Jenis yang namanya sering memuat rincian teknis (versi OS/basis data, nama VPN/jaringan, perangkat keamanan):
 * di portal publik namanya diganti label jenis + ID.
 */
export const MASKED_INFRA = new Set<string>(["platform", "jip", "jaringan", "perangkat_keamanan"]);

/** Versi komponen untuk portal publik: tanpa deskripsi, pemilik, pengelola, spesifikasi teknis, nama relasi, atau dependensi keamanan. */
export function toPublicInfra(r: Infrastruktur): Infrastruktur {
  const atribut: Record<string, string> = {};
  for (const a of jenisConfig[r.jenis].attrs) {
    const value = r.atribut[a.key];
    if (value && (a.metric || PUBLIC_ATTRS.has(a.key))) atribut[a.key] = value;
  }
  const ids = (list: { id: string }[]) => list.map((x) => ({ id: x.id, name: "" }));
  return {
    ...r,
    name: MASKED_INFRA.has(r.jenis) ? `${jenisConfig[r.jenis].label} ${r.id}` : r.name,
    deskripsi: null,
    pemilik: null,
    pengelola: null,
    atribut,
    relasi: r.relasi.map((x) => ({ id: x.id, name: "", jenis: x.jenis })),
    terhubung: r.terhubung.map((x) => ({ id: x.id, name: "", jenis: x.jenis })),
    aplikasi: ids(r.aplikasi),
    data: ids(r.data),
    probis: ids(r.probis),
    security: {},
  };
}
