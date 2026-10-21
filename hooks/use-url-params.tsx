"use client";
import { usePathname } from "next/navigation";
import { createContext, Fragment, useContext, useEffect, useState } from "react";

/**
 * Query string halaman untuk dashboard publik, tanpa `useSearchParams`: hook itu membuat halaman statis
 * dirender di klien saja (HTML hanya berisi kerangka), sehingga konten utama baru tampil setelah semua
 * JavaScript berjalan. Di sini HTML server memakai filter bawaan; bila URL membawa filter, isi
 * dashboard dipasang ulang sekali setelah halaman terbuka.
 */
const SearchContext = createContext("");

export function UrlParamsBoundary({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [search, setSearch] = useState("");

  useEffect(() => {
    // Hanya dibaca di peramban, setelah hidrasi dan tiap pindah halaman.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearch(window.location.search.slice(1));
  }, [pathname]);

  return (
    <SearchContext.Provider value={search}>
      <Fragment key={search}>{children}</Fragment>
    </SearchContext.Provider>
  );
}

/** Pengganti `useSearchParams` untuk nilai awal filter dashboard. */
export function useUrlParams() {
  return new URLSearchParams(useContext(SearchContext));
}
