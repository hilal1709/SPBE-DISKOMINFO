"use client";
import { useRef } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MOTION_OK, gsap, motion, useGSAP } from "./gsap";

gsap.registerPlugin(ScrollTrigger);

/**
 * Menganimasikan setiap turunan bertanda `data-reveal` saat masuk viewport (stagger, sekali jalan).
 * Elemen bertanda yang muncul belakangan ikut ditampilkan dengan animasi yang sama.
 */
export function Reveal({ stagger = motion.stagger, ...props }: React.ComponentProps<"div"> & { stagger?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        // Yang sudah terlihat dianimasikan CSS (globals.css); yang masih di bawah layar muncul saat digulir.
        // Elemen yang dirender belakangan (mis. setelah filter berubah) juga memakai animasi CSS itu.
        const below = gsap.utils.toArray<HTMLElement>("[data-reveal]", ref.current).filter((el) => el.getBoundingClientRect().top > window.innerHeight);
        if (!below.length) return;
        gsap.set(below, { opacity: 0, y: 14 });
        ScrollTrigger.batch(below, { start: "top 96%", once: true, onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 0.6, stagger, overwrite: true }) });
      });
    },
    { scope: ref },
  );

  return <div ref={ref} {...props} />;
}
