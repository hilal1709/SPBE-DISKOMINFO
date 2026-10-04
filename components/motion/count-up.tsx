"use client";
import { useRef } from "react";
import { cn } from "@/lib/utils";
import { MOTION_OK, gsap, useGSAP } from "./gsap";

const formatter = (decimals: number) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

/** Angka statistik yang menghitung naik saat terlihat (pola "number ticker" 21st.dev). */
export function CountUp({ value, decimals = 0, suffix = "", className }: { value: number; decimals?: number; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const format = (n: number) => formatter(decimals).format(n) + suffix;

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const counter = { n: 0 };
        el.textContent = format(0);
        gsap.to(counter, {
          n: value,
          duration: 1.4,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 98%", once: true },
          onUpdate: () => { el.textContent = format(counter.n); },
        });
      });
    },
    { dependencies: [value] },
  );

  return <span ref={ref} className={cn("tabular-nums", className)}>{format(value)}</span>;
}
