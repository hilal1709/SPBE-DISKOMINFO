import { makeVersionedRef } from "@/lib/reference/versioned";
import { sampleRalSet } from "./reference";

/** Referensi RAL berversi untuk layanan (server saja). Mesinnya sama dengan RAB: lib/reference/versioned.ts. */
export const ral = makeVersionedRef({
  label: "RAL",
  codeExample: "RAL.01.23.01",
  refTable: "ral_references",
  versionTable: "ral_versions",
  changeTable: "ral_changes",
  periodColumn: "ral_version_id",
  sampleSet: sampleRalSet,
  usage: { table: "services", col: "ral", unit: "layanan" },
});

export const loadRalSet = ral.loadSet;
export const ralSetSafe = ral.setSafe;
