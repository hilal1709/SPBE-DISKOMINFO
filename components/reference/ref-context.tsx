"use client";
import { createContext, useContext, useMemo } from "react";
import { makeRabIndex, type RabIndex, type RabSet } from "@/lib/probis/rab-index";

export type RefContext = { forPeriod: (period?: string | null) => RabIndex; active: RabIndex; set: RabSet };

function build(set: RabSet): RefContext {
  const indexes = new Map(set.versions.map((v) => [v.id, makeRabIndex(v.nodes)]));
  const active = indexes.get(set.activeVersion) ?? makeRabIndex([]);
  return { set, active, forPeriod: (period) => indexes.get(set.periodVersion[period ?? ""] ?? set.activeVersion) ?? active };
}

/**
 * Context referensi berversi untuk komponen klien (RAB, RAL, RAD, RAA, RAI). Set selalu dikirim server lewat
 * provider (dari database, atau referensi bawaan bila database kosong), sehingga JSON referensi bawaan tidak
 * ikut bundel klien. Tanpa provider, referensi kosong.
 */
export function createRefContext() {
  const Context = createContext<RefContext | null>(null);
  const fallback = build({ versions: [], periodVersion: {}, activeVersion: "" });

  function Provider({ set, children }: { set: RabSet; children: React.ReactNode }) {
    const value = useMemo(() => build(set), [set]);
    return <Context.Provider value={value}>{children}</Context.Provider>;
  }

  /** Akses semua versi: `forPeriod(p)` untuk daftar yang mencampur beberapa periode. */
  function useSet(): RefContext {
    return useContext(Context) ?? fallback;
  }

  /** Referensi untuk periode tertentu (default: versi periode aktif). */
  function useIndex(period?: string | null): RabIndex {
    const context = useSet();
    return period === undefined ? context.active : context.forPeriod(period);
  }

  return { Provider, useSet, useIndex };
}
