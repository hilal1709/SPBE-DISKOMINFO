"use client";
import { createContext, useContext, useMemo } from "react";
import { makeRabIndex, type RabIndex, type RabSet } from "@/lib/probis/rab-index";
import { sampleRabSet } from "@/lib/probis/reference";

type RabContext = { forPeriod: (period?: string | null) => RabIndex; active: RabIndex; set: RabSet };

const Context = createContext<RabContext | null>(null);

function build(set: RabSet): RabContext {
  const indexes = new Map(set.versions.map((v) => [v.id, makeRabIndex(v.nodes)]));
  const active = indexes.get(set.activeVersion) ?? makeRabIndex([]);
  return { set, active, forPeriod: (period) => indexes.get(set.periodVersion[period ?? ""] ?? set.activeVersion) ?? active };
}

/** Menyediakan referensi RAB (dari database, per versi) untuk komponen klien. */
export function RabProvider({ set, children }: { set: RabSet; children: React.ReactNode }) {
  const value = useMemo(() => build(set), [set]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

/** Referensi RAB untuk periode tertentu (default: versi periode aktif). */
export function useRab(period?: string | null): RabIndex {
  const context = useRabSet();
  return period === undefined ? context.active : context.forPeriod(period);
}

/** Akses semua versi: `forPeriod(p)` untuk daftar yang mencampur beberapa periode. */
export function useRabSet(): RabContext {
  const context = useContext(Context);
  return context ?? fallback;
}

const fallback = build(sampleRabSet);
