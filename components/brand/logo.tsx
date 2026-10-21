"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { loadAnime, motionOk } from "@/components/motion/anime-lazy";
import { cn } from "@/lib/utils";
import { LOGO_BAR_HEIGHT, logoBars, logoColors } from "./logo-geometry";

const bars = (root: Element | null) => root?.querySelectorAll<SVGGElement>("[data-logo-bar]") ?? [];
/** Jeda per lapisan, dari dasar gapura ke puncak; dua belahan satu lapisan bergerak bersamaan. */
const fromBase = (step: number, start = 0) => (el: unknown) => start + (4 - Number((el as SVGGElement).dataset.row)) * step;

/** Simbol logo "Gapura Lapisan": lima lapisan arsitektur bertumpuk menjadi gapura bertingkat. */
export function LogoMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("size-10 shrink-0", className)} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <rect width="40" height="40" rx="10" fill={logoColors.tile} />
      {logoBars.map((bar) => (
        // Lapisan dibungkus <g>: anime.js menganimasikan x/y <rect> sebagai atribut, bukan transform.
        <g key={`${bar.row}-${bar.x}`} data-logo-bar data-row={bar.row} style={{ transformBox: "fill-box", transformOrigin: "center" }}>
          <rect x={bar.x} y={bar.y} width={bar.w} height={LOGO_BAR_HEIGHT} rx={LOGO_BAR_HEIGHT / 2} fill={logoColors[bar.color]} />
        </g>
      ))}
    </svg>
  );
}

/**
 * Logo lengkap (simbol + wordmark). Saat muncul, gapura tersusun dari lapisan dasar ke puncak; saat hover,
 * lapisan terangkat bergelombang dari bawah. Keduanya memakai anime.js. `tone="dark"` untuk latar charcoal.
 */
export function Logo({ href = "/", subtitle = "Kabupaten Gresik", tone = "light", className }: { href?: string; subtitle?: string; tone?: "light" | "dark"; className?: string }) {
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!motionOk()) return;
    let intro: { revert: () => void } | undefined;
    let active = true;
    loadAnime().then(({ animate }) => {
      if (!active) return;
      intro = animate(bars(ref.current), {
        scaleX: [0.2, 1],
        y: [3, 0],
        opacity: [0, 1],
        duration: 650,
        delay: fromBase(70, 150),
        ease: "out(4)",
      });
    });
    return () => {
      active = false;
      intro?.revert();
    };
  }, []);

  const ripple = () => {
    if (!motionOk()) return;
    loadAnime().then(({ animate }) => animate(bars(ref.current), { y: [0, -1.4, 0], duration: 480, delay: fromBase(45), ease: "inOut(2)", composition: "replace" }));
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
