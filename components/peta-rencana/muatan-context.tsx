"use client";
import { createContext, useContext, useMemo } from "react";
import { defaultMuatanBook, muatanBook, type MuatanBook, type MuatanDef } from "@/lib/peta-rencana/muatan";

const MuatanContext = createContext<MuatanBook>(defaultMuatanBook);

export function MuatanProvider({ list, children }: { list: MuatanDef[]; children: React.ReactNode }) {
  const book = useMemo(() => muatanBook(list), [list]);
  return <MuatanContext.Provider value={book}>{children}</MuatanContext.Provider>;
}

/** Daftar muatan yang berlaku: `muatan.get(kunci)`, `muatan.list`, `muatan.options`, `muatan.keys`. */
export const useMuatan = () => useContext(MuatanContext);
