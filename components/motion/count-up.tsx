"use client";
import { useRef } from "react";
import { cn } from "@/lib/utils";
import { MOTION_OK, gsap, useGSAP } from "./gsap";

const formatter = (decimals: number) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

/**
 * Angka statistik yang menghitung naik saat terlihat, lalu bergulir dari nilai sebelumnya
 * setiap kali nilainya berubah (pola "number ticker" 21st.dev).
 */
export function CountUp({
  value,
  decimals = 0,
  suffix = "",
  instant,
  className,
}: {
  value: number;
  decimals?: number;
  suffix?: string;
  /** Tampilkan nilai awal langsung (untuk baris di dalam daftar bergulir); animasi hanya saat berubah. */
  instant?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  /** Nilai yang sedang tampil; tween berikutnya berangkat dari sini. */
  const counter = useRef<{ n: number } | null>(null);
  const format = (n: number) => formatter(decimals).format(n) + suffix;

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const first = counter.current === null;
        if (first && instant) {
          counter.current = { n: value };
          return;
        }
        counter.current ??= { n: 0 };
        const state = counter.current;
        el.textContent = format(state.n);
        gsap.to(state, {
          n: value,
          duration: first ? 1.4 : 0.7,
          ease: "power2.out",
          overwrite: true,
          scrollTrigger: first ? { trigger: el, start: "top 98%", once: true } : undefined,
          onUpdate: () => {
            el.textContent = format(state.n);
          },
        });
        if (!first) gsap.fromTo(el, { scale: 1.08, transformOrigin: "left center" }, { scale: 1, duration: 0.5, ease: "back.out(3)", overwrite: "auto" });
      });
    },
    { dependencies: [value] },
  );

  return <span ref={ref} className={cn("inline-block tabular-nums", className)}>{format(value)}</span>;
}
