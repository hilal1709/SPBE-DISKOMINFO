import type { Rencana } from "@/lib/types";
import { muatanConfig } from "./muatan";

/** Muatan yang rinciannya hanya untuk pengguna login (S5). */
const RESTRICTED = new Set<Rencana["muatan"]>(["keamanan", "audit"]);

/**
 * Versi kegiatan untuk portal publik: kegiatan Keamanan dan Audit tetap dihitung di grafik dan kartu, tetapi nama,
 * program, inisiatif, target, realisasi, evaluasi, dan rujukannya tidak dikirim ke browser.
 */
export function toPublicRencana(r: Rencana): Rencana {
  if (!RESTRICTED.has(r.muatan)) return r;
  return {
    ...r,
    name: `Kegiatan ${muatanConfig[r.muatan].label} (rincian terbatas)`,
    program: null,
    inisiatif: null,
    target: null,
    realisasi: null,
    evaluasi: null,
    sourceRef: null,
    deferredFrom: null,
    tautan: [],
    restricted: true,
  };
}

export const toPublicRencanaList = <T extends { rows: Rencana[] }>(data: T): T => ({ ...data, rows: data.rows.map(toPublicRencana) });
