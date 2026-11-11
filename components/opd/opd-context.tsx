"use client";
import { createContext, useContext, useMemo } from "react";
import { fallbackDirectory, opdBook, type OpdBook, type OpdDirectory } from "@/lib/opd/directory";

const OpdContext = createContext<OpdBook>(opdBook(fallbackDirectory));

export function OpdProvider({ directory, children }: { directory: OpdDirectory; children: React.ReactNode }) {
  const book = useMemo(() => opdBook(directory), [directory]);
  return <OpdContext.Provider value={book}>{children}</OpdContext.Provider>;
}

/** Nama dan daftar Perangkat Daerah mengikuti periode: `opd.name(kode, periode)`, `opd.list(periode)`. */
export const useOpd = () => useContext(OpdContext);
