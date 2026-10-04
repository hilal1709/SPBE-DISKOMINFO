"use client";
import { createRefContext } from "@/components/reference/ref-context";
import { sampleRabSet } from "@/lib/probis/reference";

const rab = createRefContext(sampleRabSet);

/** Menyediakan referensi RAB (dari database, per versi) untuk komponen klien. */
export const RabProvider = rab.Provider;
/** Referensi RAB untuk periode tertentu (default: versi periode aktif). */
export const useRab = rab.useIndex;
/** Akses semua versi RAB. */
export const useRabSet = rab.useSet;
