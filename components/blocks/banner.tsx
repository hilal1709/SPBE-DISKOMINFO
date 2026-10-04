"use client";
import { useRef, useState } from "react";
import { Alert02Icon, Cancel01Icon, CheckmarkCircle02Icon, InformationCircleIcon } from "@hugeicons/core-free-icons";
import { Icon, type IconSvgElement } from "@/components/icon";
import { MOTION_OK, gsap } from "@/components/motion/gsap";
import { cn } from "@/lib/utils";

type Variant = "info" | "warning" | "success";

const styles: Record<Variant, { box: string; badge: string; icon: IconSvgElement }> = {
  info: { box: "bg-brand-sky/55 text-brand-charcoal", badge: "bg-brand-charcoal text-white", icon: InformationCircleIcon },
  warning: { box: "bg-brand-yellow/35 text-brand-charcoal", badge: "bg-brand-yellow text-brand-charcoal", icon: Alert02Icon },
  success: { box: "bg-brand-teal/15 text-brand-charcoal", badge: "bg-brand-teal text-brand-charcoal", icon: CheckmarkCircle02Icon },
};

/**
 * Banner pengumuman sebaris (pola banner @diceui / @dubinc di 21st.dev).
 * Dapat ditutup; tinggi menyusut halus dengan GSAP.
 */
export function Banner({
  variant = "info",
  label,
  children,
  action,
  dismissible = true,
  className,
}: {
  variant?: Variant;
  /** Label singkat di pil, mis. "Demo" atau "Baru". */
  label?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  dismissible?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(true);
  const ref = useRef<HTMLDivElement>(null);
  const style = styles[variant];

  const close = () => {
    const el = ref.current;
    const mm = gsap.matchMedia();
    let animated = false;
    mm.add(MOTION_OK, () => {
      animated = true;
      gsap.to(el, { height: 0, opacity: 0, paddingTop: 0, paddingBottom: 0, marginTop: 0, marginBottom: 0, duration: 0.35, ease: "power2.inOut", onComplete: () => setOpen(false) });
    });
    if (!animated) setOpen(false);
  };

  if (!open) return null;

  return (
    <div ref={ref} role="status" className={cn("flex items-center gap-3 overflow-hidden rounded-xl px-4 py-2.5 text-sm", style.box, className)}>
      {label ? (
        <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold", style.badge)}>{label}</span>
      ) : (
        <Icon icon={style.icon} size={18} className="shrink-0" />
      )}
      <p className="min-w-0 flex-1">{children}</p>
      {action}
      {dismissible && (
        <button type="button" onClick={close} aria-label="Tutup banner" className="grid size-7 shrink-0 place-items-center rounded-full transition-colors hover:bg-black/5">
          <Icon icon={Cancel01Icon} size={14} />
        </button>
      )}
    </div>
  );
}
