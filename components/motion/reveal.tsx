"use client";
import { useRef } from "react";
import { MOTION_OK, ScrollTrigger, gsap, motion, useGSAP } from "./gsap";

/**
 * Menganimasikan setiap turunan bertanda `data-reveal` saat masuk viewport (stagger, sekali jalan).
 * Pasang `data-reveal` hanya pada section yang selalu dirender — elemen yang muncul belakangan tidak ikut dianimasikan.
 */
export function Reveal({ stagger = motion.stagger, ...props }: React.ComponentProps<"div"> & { stagger?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const items = gsap.utils.toArray<HTMLElement>("[data-reveal]", ref.current);
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        ScrollTrigger.batch(items, {
          start: "top 96%",
          once: true,
          onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 0.6, stagger, overwrite: true }),
        });
      });
    },
    { scope: ref },
  );

  return <div ref={ref} {...props} />;
}
