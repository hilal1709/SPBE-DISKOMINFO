"use client";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/icon";
import { MOTION_OK, gsap, useGSAP } from "@/components/motion/gsap";
import { activeItem, flattenNav, isGroup, type NavEntry, type NavGroup, type NavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export type NavBadges = Partial<Record<NonNullable<NavItem["badgeKey"]>, number>>;

/** Titik kecil yang berdenyut selama tautan sedang memuat halaman tujuan. */
function PendingHint() {
  const { pending } = useLinkStatus();
  return (
    <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full bg-current transition-opacity duration-200", pending ? "animate-pulse opacity-80" : "opacity-0")} />
  );
}

type Shared = { active: NavItem | undefined; tone: "light" | "dark"; badges?: NavBadges; onNavigate?: () => void; hover: (el: HTMLElement | null) => void };

function ItemLink({ item, nested, active, tone, badges, onNavigate, hover }: Shared & { item: NavItem; nested?: boolean }) {
  const isActive = item === active;
  const count = item.badgeKey ? badges?.[item.badgeKey] : undefined;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      onPointerEnter={(event) => hover(event.currentTarget)}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-3 rounded-lg px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
        nested ? "py-2" : "py-2.5",
        item.soon && !isActive && "opacity-70",
        isActive
          ? "bg-primary text-primary-foreground shadow-[inset_0_-1px_0_rgb(0_0_0/0.08)]"
          : tone === "dark" ? "text-panel-foreground hover:text-white" : "text-sidebar-foreground hover:text-sidebar-accent-foreground",
      )}
    >
      <Icon icon={item.icon} size={nested ? 16 : 18} className={cn("shrink-0", !isActive && "opacity-80")} />
      <span className="grid min-w-0 flex-1">
        <span className="truncate">{item.label}</span>
        {nested && item.description && <span className={cn("truncate text-[11px] font-normal", isActive ? "opacity-80" : "text-muted-foreground")}>{item.description}</span>}
      </span>
      {item.soon && <span className="rounded-full bg-muted px-1.5 py-px text-[10px] font-semibold text-muted-foreground">Segera</span>}
      {!!count && <span className={cn("min-w-5 rounded-full px-1.5 text-center text-[11px] font-bold tabular-nums", isActive ? "bg-primary-foreground/20" : "bg-brand-orange text-brand-charcoal")}>{count}</span>}
      <PendingHint />
    </Link>
  );
}

/** Menu besar yang bisa dibuka-tutup; terbuka otomatis bila berisi halaman aktif. */
function Group({ group, ...shared }: Shared & { group: NavGroup }) {
  const containsActive = group.children.includes(shared.active!);
  const [open, setOpen] = useState(containsActive || group.children.some((c) => !c.soon));
  const body = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  // Ikut membuka saat berpindah ke halaman di dalam grup ini.
  const [lastActive, setLastActive] = useState(shared.active);
  if (shared.active !== lastActive) {
    setLastActive(shared.active);
    if (containsActive && !open) setOpen(true);
  }

  useGSAP(
    () => {
      if (first.current) {
        first.current = false;
        return;
      }
      gsap.matchMedia().add(MOTION_OK, () => {
        if (open) gsap.fromTo(body.current, { height: 0, opacity: 0 }, { height: "auto", opacity: 1, duration: 0.35, ease: "power3.out", clearProps: "height,opacity" });
      });
    },
    { dependencies: [open] },
  );

  const total = group.children.reduce((sum, c) => sum + (c.badgeKey ? shared.badges?.[c.badgeKey] ?? 0 : 0), 0);

  return (
    <div className="grid gap-0.5">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onPointerEnter={(event) => shared.hover(event.currentTarget)}
        className={cn(
          "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
          containsActive ? "text-foreground" : "text-sidebar-foreground hover:text-sidebar-accent-foreground",
        )}
      >
        <Icon icon={group.icon} size={18} className="shrink-0 opacity-80" />
        <span className="flex-1 truncate">{group.label}</span>
        {!open && total > 0 && <span className="min-w-5 rounded-full bg-brand-orange px-1.5 text-center text-[11px] font-bold text-brand-charcoal tabular-nums">{total}</span>}
        <Icon icon={ArrowDown01Icon} size={14} className={cn("shrink-0 opacity-60 transition-transform duration-300", open && "rotate-180")} />
      </button>
      {open && (
        <div ref={body} className="ml-[1.3rem] grid gap-0.5 overflow-hidden border-l border-sidebar-border pl-2">
          {group.children.map((item) => (
            <ItemLink key={item.href} item={item} nested {...shared} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Navigasi sidebar dengan sorotan hover yang meluncur antar item (GSAP).
 * Mendukung menu besar (grup) berisi sub-menu dengan keterangan singkat.
 * `tone="dark"` untuk panel navy CMS.
 */
export function SidebarNav({ items, tone = "light", badges, onNavigate }: { items: NavEntry[]; tone?: "light" | "dark"; badges?: NavBadges; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = activeItem(flattenNav(items), pathname);
  const nav = useRef<HTMLElement>(null);
  const highlight = useRef<HTMLSpanElement>(null);
  const hover = (target: HTMLElement | null) => {
    if (!target || !nav.current) return gsap.to(highlight.current, { opacity: 0, duration: 0.2 });
    const first = gsap.getProperty(highlight.current, "opacity") === 0;
    const box = target.getBoundingClientRect();
    const origin = nav.current.getBoundingClientRect();
    gsap.to(highlight.current, { x: box.left - origin.left, y: box.top - origin.top, width: box.width, height: box.height, opacity: 1, duration: first ? 0 : 0.35, ease: "power3.out" });
  };
  const shared: Shared = { active, tone, badges, onNavigate, hover };

  return (
    <nav ref={nav} aria-label="Navigasi utama" className="relative grid gap-1" onPointerLeave={() => hover(null)}>
      <span ref={highlight} aria-hidden className={cn("pointer-events-none absolute top-0 left-0 rounded-lg opacity-0", tone === "dark" ? "bg-panel-accent" : "bg-sidebar-accent")} />
      {items.map((entry) => (isGroup(entry) ? <Group key={entry.label} group={entry} {...shared} /> : <ItemLink key={entry.href} item={entry} {...shared} />))}
    </nav>
  );
}
