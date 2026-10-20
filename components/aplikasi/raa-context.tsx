"use client";
import { createRefContext } from "@/components/reference/ref-context";
import { sampleRaaSet } from "@/lib/aplikasi/reference";

const raa = createRefContext(sampleRaaSet);

/** Menyediakan referensi RAA (dari database, per versi) untuk komponen klien. */
export const RaaProvider = raa.Provider;
/** Referensi RAA untuk periode tertentu (default: versi periode aktif). */
export const useRaa = raa.useIndex;
/** Akses semua versi RAA. */
export const useRaaSet = raa.useSet;
