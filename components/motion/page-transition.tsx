"use client";
import { useRef } from "react";
import { MOTION_OK, gsap, useGSAP } from "./gsap";

/** Halaman pertama tampil apa adanya dari HTML server; transisi hanya untuk perpindahan route di klien. */
let firstPage = true;

/** Transisi halus konten halaman saat berpindah route (dipakai di template.tsx). */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    if (firstPage) {
      firstPage = false;
      return;
    }
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      gsap.from(ref.current, { opacity: 0, duration: 0.35, ease: "power1.out", clearProps: "opacity" });
    });
  });
  return <div ref={ref}>{children}</div>;
}
