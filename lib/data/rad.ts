import { makeVersionedRef } from "@/lib/reference/versioned";
import { sampleRadSet } from "./reference";

/** Referensi RAD berversi untuk data & informasi (server saja). Mesinnya sama dengan RAB/RAL: lib/reference/versioned.ts. */
export const rad = makeVersionedRef({
  label: "RAD",
  codeExample: "RAD.09.06.03",
  refTable: "rad_references",
  versionTable: "rad_versions",
  changeTable: "rad_changes",
  periodColumn: "rad_version_id",
  sampleSet: sampleRadSet,
  usage: { table: "datasets", col: "rad", unit: "data" },
  // Beberapa RAD Level 2 (mis. RAD.10.04 Data Dukung Lainnya) tidak memiliki Level 3.
  leafLevels: [2, 3],
});

export const loadRadSet = rad.loadSet;
export const radSetSafe = rad.setSafe;
