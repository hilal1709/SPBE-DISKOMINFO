"use client";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { Icon } from "@/components/icon";
import { gsap } from "@/components/motion/gsap";
import { activeItem, type NavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";

/** Titik kecil yang berdenyut selama tautan sedang memuat halaman tujuan. */
function PendingHint() {
  const { pending } = useLinkStatus();
  return (
    <span aria-hidden className={cn("ml-auto size-1.5 rounded-full bg-current transition-opacity duration-200", pending ? "animate-pulse opacity-80" : "opacity-0")} />
  );
}

/**
 * Navigasi sidebar dengan sorotan hover yang meluncur antar item (GSAP).
 * `tone="dark"` untuk panel navy CMS.
 */
export function SidebarNav({ items, tone = "light", onNavigate }: { items: NavItem[]; tone?: "light" | "dark"; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = activeItem(items, pathname);
  const nav = useRef<HTMLElement>(null);
  const highlight = useRef<HTMLSpanElement>(null);
  const moveTo = (target: HTMLElement | null) => {
    if (!target) return gsap.to(highlight.current, { opacity: 0, duration: 0.2 });
    const first = gsap.getProperty(highlight.current, "opacity") === 0;
    gsap.to(highlight.current, { y: target.offsetTop, height: target.offsetHeight, opacity: 1, duration: first ? 0 : 0.35, ease: "power3.out" });
  };

  return (
    <nav ref={nav} aria-label="Navigasi utama" className="relative grid gap-1" onPointerLeave={() => moveTo(null)}>
      <span ref={highlight} aria-hidden className={cn("pointer-events-none absolute inset-x-0 top-0 rounded-lg opacity-0", tone === "dark" ? "bg-panel-accent" : "bg-sidebar-accent")} />
      {items.map((item) => {
        const isActive = item === active;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            onPointerEnter={(event) => moveTo(event.currentTarget)}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
              isActive
                ? "bg-primary text-primary-foreground shadow-[inset_0_-1px_0_rgb(0_0_0/0.08)]"
                : tone === "dark" ? "text-panel-foreground hover:text-white" : "text-sidebar-foreground hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon icon={item.icon} size={18} className={cn(!isActive && "opacity-80")} />
            <span className="truncate">{item.label}</span>
            <PendingHint />
          </Link>
        );
      })}
    </nav>
  );
}
