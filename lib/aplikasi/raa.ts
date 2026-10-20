import { makeVersionedRef } from "@/lib/reference/versioned";
import { sampleRaaSet } from "./reference";

/** Referensi RAA berversi untuk aplikasi (server saja). Mesinnya sama dengan RAB/RAL/RAD: lib/reference/versioned.ts. */
export const raa = makeVersionedRef({
  label: "RAA",
  codeExample: "RAA.01.02",
  refTable: "raa_references",
  versionTable: "raa_versions",
  changeTable: "raa_changes",
  periodColumn: "raa_version_id",
  sampleSet: sampleRaaSet,
  usage: { table: "applications", col: "raa", unit: "aplikasi" },
  // Template analis baru memuat RAA sampai Level 2 (sheet "RAA Level 3" masih kosong).
  leafLevels: [2, 3],
});

export const loadRaaSet = raa.loadSet;
export const raaSetSafe = raa.setSafe;
