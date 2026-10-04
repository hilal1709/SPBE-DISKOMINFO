"use client";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { gsap } from "./gsap";

/** Kartu dengan sorotan amber yang mengikuti kursor dan sedikit terangkat saat hover (pola "spotlight card" 21st.dev). */
export function SpotlightCard({ className, children, style, ...props }: React.ComponentProps<typeof Card>) {
  const follow = (event: React.PointerEvent<HTMLDivElement>) => {
    const card = event.currentTarget;
    const box = card.getBoundingClientRect();
    gsap.to(card, { "--spot-x": `${event.clientX - box.left}px`, "--spot-y": `${event.clientY - box.top}px`, duration: 0.35, ease: "power2.out" });
  };

  return (
    <Card
      onPointerMove={follow}
      style={{ "--spot-x": "50%", "--spot-y": "-40%", ...style } as React.CSSProperties}
      className={cn("group/spot relative transition-[translate,box-shadow] duration-300 ease-(--ease-out) hover:-translate-y-0.5 hover:shadow-raised", className)}
      {...props}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/spot:opacity-100"
        style={{ background: "radial-gradient(260px circle at var(--spot-x) var(--spot-y), color-mix(in oklab, var(--primary) 14%, transparent), transparent 70%)" }}
      />
      {children}
    </Card>
  );
}
