"use client";
import Link from "next/link";
import { useRef } from "react";
import { MOTION_OK, gsap } from "@/components/motion/gsap";
import { cn } from "@/lib/utils";
import { LOGO_BAR_HEIGHT, logoBars, logoColors } from "./logo-geometry";

/** Simbol logo: lima lapisan arsitektur membentuk huruf G. */
export function LogoMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("size-10 shrink-0", className)} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <rect width="40" height="40" rx="10" fill={logoColors.tile} />
      {logoBars.map((bar) => (
        <rect key={`${bar.row}-${bar.x}`} data-logo-bar data-row={bar.row} x={bar.x} y={bar.y} width={bar.w} height={LOGO_BAR_HEIGHT} rx={LOGO_BAR_HEIGHT / 2} fill={logoColors[bar.color]} />
      ))}
    </svg>
  );
}

/**
 * Logo lengkap (simbol + wordmark). Saat hover, lapisan bergeser bertahap — micro-interaction GSAP.
 * `tone="dark"` untuk latar charcoal.
 */
export function Logo({ href = "/", subtitle = "Kabupaten Gresik", tone = "light", className }: { href?: string; subtitle?: string; tone?: "light" | "dark"; className?: string }) {
  const ref = useRef<HTMLAnchorElement>(null);

  const ripple = () => {
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      const bars = ref.current?.querySelectorAll("[data-logo-bar]") ?? [];
      gsap.fromTo(bars, { x: 0 }, { keyframes: { x: [0, 2.5, 0] }, duration: 0.5, ease: "power2.inOut", stagger: 0.05, overwrite: true });
    });
  };

  return (
    <Link ref={ref} href={href} onPointerEnter={ripple} className={cn("group flex items-center gap-3 rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50", className)}>
      <LogoMark />
      <span className="leading-tight">
        <span className={cn("block text-[15px] font-extrabold tracking-tight", tone === "dark" ? "text-white" : "text-foreground")}>Arsitektur SPBE</span>
        <span className={cn("block text-xs font-medium", tone === "dark" ? "text-panel-muted" : "text-muted-foreground")}>{subtitle}</span>
      </span>
    </Link>
  );
}
