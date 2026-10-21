"use client";
import { useSyncExternalStore } from "react";

/** Di bawah breakpoint `md` Tailwind. */
const query = "(max-width: 767px)";

function subscribe(callback: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

/** true bila layar selebar ponsel; false saat render server. */
export function useIsPhone() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}
