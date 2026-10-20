"use client";
import { createContext, useContext } from "react";
import type { SecurityKey } from "@/lib/data/reference";
import { securityLabel, type SecurityRef } from "@/lib/keamanan/link";

const Context = createContext<SecurityRef[]>([]);

/** Menyediakan kegiatan keamanan tervalidasi untuk tautan dependensi keamanan di form & detail CMS. */
export function SecurityProvider({ refs, children }: { refs: SecurityRef[]; children: React.ReactNode }) {
  return <Context.Provider value={refs}>{children}</Context.Provider>;
}

/** Kegiatan keamanan per periode & jenis, dan teks tampilan isian tertaut. */
export function useSecurityRefs() {
  const refs = useContext(Context);
  return {
    refs,
    options: (period: string, key: SecurityKey) => refs.filter((r) => r.period === period && r.jenis === key),
    label: (value: string, key: SecurityKey, period: string) => securityLabel(value, key, period, refs),
  };
}
