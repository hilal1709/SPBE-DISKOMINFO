"use client";
import { useRef } from "react";
import { cn } from "@/lib/utils";
import { MOTION_OK, gsap, useGSAP } from "./gsap";

/** Bar persentase yang tumbuh dari kiri saat terlihat. */
export function Meter({ value, label, className, indicatorClassName }: { value: number; label: string; className?: string; indicatorClassName?: string }) {
  const bar = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      gsap.from(bar.current, { scaleX: 0, duration: 1.1, ease: "power3.out", scrollTrigger: { trigger: bar.current, start: "top 98%", once: true } });
    });
  });

  return (
    <div role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} className={cn("h-2 overflow-hidden rounded-full bg-muted", className)}>
      <div ref={bar} className={cn("h-full origin-left rounded-full bg-primary", indicatorClassName)} style={{ width: `${value}%` }} />
    </div>
  );
}
