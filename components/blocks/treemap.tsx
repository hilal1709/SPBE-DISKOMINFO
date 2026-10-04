"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MOTION_OK, gsap, useGSAP } from "@/components/motion/gsap";
import { cn } from "@/lib/utils";

export type TreemapItem = { code: string; label: string; value: number };
type Rect = { x: number; y: number; w: number; h: number };

/** Squarified treemap (Bruls et al.): petak serapat mungkin mendekati persegi, mengisi seluruh bidang. */
function squarify(values: number[], width: number, height: number): Rect[] {
  const total = values.reduce((a, b) => a + b, 0);
  const out: Rect[] = [];
  if (!total || !width || !height) return out;
  const areas = values.map((v) => (v / total) * width * height);
  let { x, y, w, h } = { x: 0, y: 0, w: width, h: height };
  const worst = (row: number[], side: number) => {
    const s = row.reduce((a, b) => a + b, 0);
    return Math.max((side * side * Math.max(...row)) / (s * s), (s * s) / (side * side * Math.min(...row)));
  };
  const place = (row: number[]) => {
    const s = row.reduce((a, b) => a + b, 0);
    if (w >= h) {
      const cw = s / h;
      let cy = y;
      for (const a of row) {
        out.push({ x, y: cy, w: cw, h: a / cw });
        cy += a / cw;
      }
      x += cw;
      w -= cw;
    } else {
      const rh = s / w;
      let cx = x;
      for (const a of row) {
        out.push({ x: cx, y, w: a / rh, h: rh });
        cx += a / rh;
      }
      y += rh;
      h -= rh;
    }
  };
  let row: number[] = [];
  for (const a of areas) {
    const side = Math.min(w, h);
    if (!row.length || worst([...row, a], side) <= worst(row, side)) row.push(a);
    else {
      place(row);
      row = [a];
    }
  }
  if (row.length) place(row);
  return out;
}

/** Warna satu rona (teal) bergradasi sesuai intensitas 0–1. */
const shade = (t: number) => `color-mix(in oklab, var(--brand-teal) ${Math.round(22 + t * 78)}%, var(--card))`;

/**
 * Treemap interaktif: ukuran petak sebanding nilai, klik petak untuk memfilter.
 * Petak muncul berurutan, berubah ukuran dengan halus saat data berubah, dan
 * menampilkan tooltip yang mengikuti kursor (pola "cursor tooltip" 21st.dev).
 */
export function Treemap({ items, selected = [], onToggle, className }: { items: TreemapItem[]; selected?: string[]; onToggle?: (code: string) => void; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const tip = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [hover, setHover] = useState<TreemapItem | null>(null);
  /** Tooltip dirender di body agar tidak terpotong `overflow-hidden` kotak treemap. */
  const [portal, setPortal] = useState<HTMLElement | null>(null);
  const ready = size.w > 0;

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setSize({ w: entry!.contentRect.width, h: entry!.contentRect.height }));
    observer.observe(el);
    setPortal(document.body);
    return () => observer.disconnect();
  }, []);

  useGSAP(
    () => {
      if (!ready) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.from(box.current!.querySelectorAll("[data-tile]"), {
          opacity: 0,
          scale: 0.85,
          duration: 0.5,
          ease: "back.out(1.6)",
          stagger: { each: 0.025, from: "start" },
          scrollTrigger: { trigger: box.current, start: "top 92%", once: true },
          clearProps: "opacity,scale",
        });
      });
    },
    { dependencies: [ready], scope: box },
  );

  /** Tooltip mengikuti kursor; berbalik ke kiri/atas bila mendekati tepi layar. */
  const moveTip = (event: React.PointerEvent) => {
    const { clientX: x, clientY: y } = event;
    const left = x > window.innerWidth - 240;
    const up = y > window.innerHeight - 120;
    gsap.to(tip.current, { x: left ? x - 14 : x + 14, y: up ? y - 14 : y + 14, xPercent: left ? -100 : 0, yPercent: up ? -100 : 0, duration: 0.25, ease: "power3.out" });
  };

  const sorted = [...items].filter((i) => i.value > 0).sort((a, b) => b.value - a.value);
  const rects = squarify(sorted.map((i) => i.value), size.w, size.h);
  const max = sorted[0]?.value ?? 1;
  const total = sorted.reduce((sum, i) => sum + i.value, 0);
  const fmt = new Intl.NumberFormat("id-ID");

  return (
    <div ref={box} onPointerMove={moveTip} onPointerLeave={() => setHover(null)} className={cn("relative overflow-hidden rounded-xl bg-card", className)}>
      {rects.map((r, i) => {
        const item = sorted[i]!;
        const active = selected.includes(item.code);
        const showLabel = r.w >= 72 && r.h >= 48;
        const showValue = r.w >= 34 && r.h >= 26;
        return (
          <button
            key={item.code}
            data-tile
            type="button"
            aria-label={`${item.code} ${item.label}: ${fmt.format(item.value)}`}
            aria-pressed={onToggle ? active : undefined}
            onClick={onToggle && (() => onToggle(item.code))}
            onPointerEnter={() => setHover(item)}
            onFocus={() => setHover(item)}
            onBlur={() => setHover(null)}
            className={cn(
              "absolute flex flex-col justify-between overflow-hidden border-2 border-card p-2 text-left text-on-brand",
              "transition-[left,top,width,height,opacity,filter] duration-500 ease-(--ease-out) hover:brightness-110 active:brightness-95 motion-reduce:transition-none",
              "focus-visible:z-10 focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none",
              active && "z-10 ring-3 ring-brand-charcoal ring-inset",
              selected.length > 0 && !active && "opacity-40 hover:opacity-90",
            )}
            style={{ left: r.x, top: r.y, width: r.w, height: r.h, background: shade(Math.sqrt(item.value / max)) }}
          >
            {showLabel && (
              <span className="min-w-0">
                <span className="block text-[10px] font-medium tabular-nums opacity-70">{item.code}</span>
                <span className="line-clamp-2 text-[11px] leading-snug font-semibold">{item.label}</span>
              </span>
            )}
            {showValue && <span className={cn("font-bold tabular-nums", r.w >= 90 && r.h >= 70 ? "text-lg" : "text-xs")}>{fmt.format(item.value)}</span>}
          </button>
        );
      })}
      {portal && createPortal(
      <div
        ref={tip}
        aria-hidden
        className={cn(
          "pointer-events-none fixed top-0 left-0 z-50 w-max max-w-56 rounded-lg bg-brand-charcoal px-3 py-2 text-xs text-white shadow-raised transition-opacity duration-150",
          hover ? "opacity-100" : "opacity-0",
        )}
      >
        {hover && (
          <>
            <p className="text-[10px] text-white/60 tabular-nums">{hover.code}</p>
            <p className="font-semibold">{hover.label}</p>
            <p className="mt-1 tabular-nums">
              <b>{fmt.format(hover.value)}</b> probis · {((hover.value / total) * 100).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%
            </p>
          </>
        )}
      </div>,
      portal,
      )}
    </div>
  );
}
