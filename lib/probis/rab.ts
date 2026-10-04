import { makeVersionedRef, refResolver, type ManagedNode, type RefChange, type VersionInfo } from "@/lib/reference/versioned";
import { sampleRabSet } from "./reference";

/** Referensi RAB berversi untuk proses bisnis (server saja). Mesinnya generik: lib/reference/versioned.ts. */
export const rab = makeVersionedRef({
  label: "RAB",
  codeExample: "RAB.09.06.03",
  refTable: "rab_references",
  versionTable: "rab_versions",
  changeTable: "rab_changes",
  periodColumn: "rab_version_id",
  sampleSet: sampleRabSet,
  usage: { table: "process_businesses", col: "rab", unit: "probis" },
});

export const loadRabSet = rab.loadSet;
export const rabSetSafe = rab.setSafe;
export const rabResolver = refResolver;
export const { listVersions, versionNodes, versionChanges } = rab;

export type RabVersionInfo = VersionInfo;
export type RabManagedNode = ManagedNode;
export type RabChange = RefChange;
