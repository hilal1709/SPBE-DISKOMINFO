import { makeVersionedRef } from "@/lib/reference/versioned";
import { sampleRaiSet } from "./reference";

/** Referensi RAI berversi untuk infrastruktur (server saja). Mesinnya sama dengan RAB/RAL/RAD/RAA: lib/reference/versioned.ts. */
export const rai = makeVersionedRef({
  label: "RAI",
  codeExample: "RAI.03.01",
  refTable: "rai_references",
  versionTable: "rai_versions",
  changeTable: "rai_changes",
  periodColumn: "rai_version_id",
  sampleSet: sampleRaiSet,
  usage: { table: "infrastructures", col: "rai", unit: "infrastruktur" },
  // Template analis baru memuat RAI sampai Level 2.
  leafLevels: [2, 3],
});

export const loadRaiSet = rai.loadSet;
export const raiSetSafe = rai.setSafe;
