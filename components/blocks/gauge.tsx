"use client";
import { useRef } from "react";
import { CountUp } from "@/components/motion/count-up";
import { MOTION_OK, gsap, useGSAP } from "@/components/motion/gsap";
import { cn } from "@/lib/utils";

/** Busur setengah lingkaran (r = 80) — panjangnya dinormalkan ke 100 lewat pathLength. */
const ARC = "M 20 100 A 80 80 0 0 1 180 100";

/** Gauge persentase setengah lingkaran; busur tumbuh saat terlihat dan bergeser halus saat nilai berubah. */
export function Gauge({ value, label, caption, className }: { value: number; label: string; /** Teks kecil di bawah angka. */ caption?: string; className?: string }) {
  const arc = useRef<SVGPathElement>(null);
  const pct = Math.min(Math.max(value, 0), 100);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      // Transisi CSS (untuk perubahan nilai) dimatikan selama animasi masuk agar tidak saling tarik.
      gsap.set(arc.current, { transition: "none" });
      gsap.from(arc.current, {
        strokeDashoffset: 100,
        duration: 1.2,
        ease: "power3.out",
        clearProps: "strokeDashoffset,transition",
        scrollTrigger: { trigger: arc.current, start: "top 98%", once: true },
      });
    });
  });

  return (
    <div role="meter" aria-label={label} aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} className={cn("mx-auto w-full max-w-64", className)}>
      <div className="relative">
        <svg viewBox="0 0 200 110" className="w-full overflow-visible" aria-hidden>
          <path d={ARC} pathLength={100} fill="none" strokeWidth={18} strokeLinecap="round" className="stroke-muted" />
          <path
            ref={arc}
            d={ARC}
            pathLength={100}
            fill="none"
            strokeWidth={18}
            strokeLinecap="round"
            strokeDasharray="100 100"
            strokeDashoffset={100 - pct}
            className="stroke-brand-teal transition-[stroke-dashoffset] duration-700 ease-(--ease-out)"
          />
        </svg>
        <div className="absolute inset-x-0 bottom-0 grid justify-items-center">
          <b className="text-4xl leading-none font-bold tracking-tight tabular-nums">
            <CountUp value={pct} decimals={1} suffix="%" />
          </b>
          {caption && <span className="mt-1 text-xs text-muted-foreground">{caption}</span>}
        </div>
      </div>
      <div className="mt-1 flex justify-between px-1 text-[11px] text-muted-foreground tabular-nums" aria-hidden>
        <span>0%</span>
        <span>100%</span>
      </div>
    </div>
  );
}
