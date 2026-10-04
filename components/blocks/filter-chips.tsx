"use client";
import { useRef } from "react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/icon";
import { MOTION_OK, gsap, useGSAP } from "@/components/motion/gsap";
import { cn } from "@/lib/utils";

export type Chip = { id: string; group: string; label: string; onRemove: () => void };

/** Satu chip: muncul memantul, menyusut keluar sebelum dihapus. */
function FilterChip({ chip }: { chip: Chip }) {
  const ref = useRef<HTMLSpanElement>(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      gsap.from(ref.current, { scale: 0.6, opacity: 0, duration: 0.4, ease: "back.out(2.2)" });
    });
  });

  const remove = () => {
    let animated = false;
    gsap.matchMedia().add(MOTION_OK, () => {
      animated = true;
      gsap.to(ref.current, { scale: 0.6, opacity: 0, width: 0, marginRight: -6, duration: 0.22, ease: "power2.in", onComplete: chip.onRemove });
    });
    if (!animated) chip.onRemove();
  };

  return (
    <span ref={ref} className="inline-flex max-w-72 items-center gap-1.5 overflow-hidden rounded-full bg-accent py-1 pr-1 pl-3 text-xs text-accent-foreground">
      <span className="shrink-0 text-muted-foreground">{chip.group}</span>
      <span className="truncate font-medium">{chip.label}</span>
      <button
        type="button"
        onClick={remove}
        aria-label={`Hapus filter ${chip.group} ${chip.label}`}
        className="grid size-5 shrink-0 place-items-center rounded-full transition-[background-color,rotate] duration-200 hover:rotate-90 hover:bg-brand-charcoal/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <Icon icon={Cancel01Icon} size={12} />
      </button>
    </span>
  );
}

/** Baris chip filter aktif yang bisa dihapus satu per satu (pola "chip group" 21st.dev). */
export function FilterChips({ chips, className }: { chips: Chip[]; className?: string }) {
  if (!chips.length) return null;
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)} aria-label="Filter aktif">
      {chips.map((chip) => (
        <FilterChip key={chip.id} chip={chip} />
      ))}
    </div>
  );
}
