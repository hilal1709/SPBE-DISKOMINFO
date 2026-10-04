"use client";
import { useRef } from "react";
import { MOTION_OK, gsap, useGSAP } from "./gsap";

/** Transisi halus konten halaman saat berpindah route (dipakai di template.tsx). */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      gsap.from(ref.current, { opacity: 0, duration: 0.35, ease: "power1.out", clearProps: "opacity" });
    });
  });
  return <div ref={ref}>{children}</div>;
}
