"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cmsListFilters, type CmsListTab } from "@/lib/cms/list-navigation";

/** URL menjadi sumber filter agar navigasi dari form dan tombol kembali tetap sesuai. */
export function useListFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const filters = cmsListFilters(params);
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    next.set(key, value);
    router.replace(`${pathname}?${next}`, { scroll: false });
  };
  return {
    ...filters,
    setTab: (tab: CmsListTab) => update("tab", tab),
    setPeriod: (period: string) => update("periode", period),
  };
}
