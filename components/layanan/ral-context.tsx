"use client";
import { createRefContext } from "@/components/reference/ref-context";
import { sampleRalSet } from "@/lib/layanan/reference";

const ral = createRefContext(sampleRalSet);

/** Menyediakan referensi RAL (dari database, per versi) untuk komponen klien. */
export const RalProvider = ral.Provider;
/** Referensi RAL untuk periode tertentu (default: versi periode aktif). */
export const useRal = ral.useIndex;
/** Akses semua versi RAL. */
export const useRalSet = ral.useSet;
