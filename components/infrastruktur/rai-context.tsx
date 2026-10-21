"use client";
import { createRefContext } from "@/components/reference/ref-context";

const rai = createRefContext();

/** Menyediakan referensi RAI (dari database, per versi) untuk komponen klien. */
export const RaiProvider = rai.Provider;
/** Referensi RAI untuk periode tertentu (default: versi periode aktif). */
export const useRai = rai.useIndex;
/** Akses semua versi RAI. */
export const useRaiSet = rai.useSet;
