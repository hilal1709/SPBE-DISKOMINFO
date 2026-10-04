"use client";
import { useRef } from "react";
import { MOTION_OK, ScrollTrigger, gsap, motion, useGSAP } from "./gsap";

/**
 * Menganimasikan setiap turunan bertanda `data-reveal` saat masuk viewport (stagger, sekali jalan).
 * Elemen bertanda yang muncul belakangan ikut ditampilkan dengan animasi yang sama.
 */
export function Reveal({ stagger = motion.stagger, ...props }: React.ComponentProps<"div"> & { stagger?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const items = gsap.utils.toArray<HTMLElement>("[data-reveal]", ref.current);
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const reveal = (batch: Element[]) => gsap.to(batch, { opacity: 1, y: 0, duration: 0.6, stagger, overwrite: true });
        ScrollTrigger.batch(items, { start: "top 96%", once: true, onEnter: reveal });

        // Elemen [data-reveal] yang dirender belakangan (mis. setelah filter berubah) langsung ditampilkan.
        const observer = new MutationObserver((mutations) => {
          const added = mutations.flatMap((m) => [...m.addedNodes]).filter((n): n is HTMLElement => n instanceof HTMLElement);
          const fresh = added.flatMap((n) => [...(n.matches("[data-reveal]") ? [n] : []), ...n.querySelectorAll<HTMLElement>("[data-reveal]")]);
          if (fresh.length) reveal(fresh);
        });
        observer.observe(ref.current!, { childList: true, subtree: true });
        return () => observer.disconnect();
      });
    },
    { scope: ref },
  );

  return <div ref={ref} {...props} />;
}
