"use client";
import { createRefContext } from "@/components/reference/ref-context";
import { sampleRadSet } from "@/lib/data/reference";

const rad = createRefContext(sampleRadSet);

/** Menyediakan referensi RAD (dari database, per versi) untuk komponen klien. */
export const RadProvider = rad.Provider;
/** Referensi RAD untuk periode tertentu (default: versi periode aktif). */
export const useRad = rad.useIndex;
/** Akses semua versi RAD. */
export const useRadSet = rad.useSet;
