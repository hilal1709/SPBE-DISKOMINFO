"use client";
import { RefPicker, type RefLabels } from "@/components/blocks/ref-picker";
import { useRab } from "@/components/probis/rab-context";

const labels: RefLabels = { ref: "RAB", l1: "sektor", l2: "urusan", l3: "sub-urusan" };

/** Pemilih RAB berjenjang untuk probis (versi RAB milik periode). */
export function RabPicker({ period, ...props }: { value: string | null; onChange: (code: string | null) => void; invalid?: boolean; id?: string; /** Periode probis: menentukan versi RAB yang dipakai. */ period?: string }) {
  return <RefPicker index={useRab(period)} labels={labels} {...props} />;
}
