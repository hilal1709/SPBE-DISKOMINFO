"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { ComputerPhoneSyncIcon, Key01Icon, Logout01Icon, Menu01Icon, ViewIcon } from "@hugeicons/core-free-icons";
import { logout } from "@/app/actions/auth";
import { Banner } from "@/components/blocks/banner";
import { Logo } from "@/components/brand/logo";
import { Icon } from "@/components/icon";
import { AosInit } from "@/components/motion/aos";
import { WordStagger } from "@/components/motion/word-stagger";
import { SidebarNav, type NavBadges } from "@/components/layout/sidebar-nav";
import { SkipLink } from "@/components/layout/skip-link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MAIN_CONTENT_ID } from "@/lib/constants";
import { activeItem, cmsNav, flattenNav, navFor } from "@/lib/navigation";
import type { Permission } from "@/lib/permissions";
import { initials } from "@/lib/roles";
import type { Role } from "@/lib/types";

export type CmsUser = { name: string; role: Role; perms: Permission[]; roleLabel: string; opdName?: string | null; demo: boolean; badges?: NavBadges };

function LogoutButton() {
  const { pending } = useFormStatus();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="submit" size="icon" variant="ghost" loading={pending} aria-label="Keluar" className="hover:bg-sidebar-accent">
          {!pending && <Icon icon={Logout01Icon} />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>Keluar</TooltipContent>
    </Tooltip>
  );
}

function Sidebar({ user, onNavigate }: { user: CmsUser; onNavigate?: () => void }) {
  return (
    <div className="flex min-h-full shrink-0 flex-col gap-8 px-4 py-6">
      <Logo href="/cms" subtitle="CMS · Kabupaten Gresik" className="px-1" />
      <SidebarNav items={navFor(cmsNav, user.perms)} badges={user.badges} onNavigate={onNavigate} />
      <div className="mt-auto flex items-center gap-3 rounded-xl bg-card/70 p-2.5">
        <Avatar className="size-9">
          <AvatarFallback className="bg-brand-teal font-bold text-brand-charcoal">{initials(user.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-semibold">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.roleLabel}{user.opdName && ` · ${user.opdName}`}</p>
        </div>
        {!user.demo && (
          <div className="ml-auto flex">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button asChild size="icon" variant="ghost" className="hover:bg-sidebar-accent">
                  <Link href="/akun/sandi" aria-label="Ganti sandi" onClick={onNavigate}>
                    <Icon icon={Key01Icon} />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Ganti sandi</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button asChild size="icon" variant="ghost" className="hover:bg-sidebar-accent">
                  <Link href="/akun/sesi" aria-label="Sesi aktif" onClick={onNavigate}>
                    <Icon icon={ComputerPhoneSyncIcon} />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Sesi aktif</TooltipContent>
            </Tooltip>
            <form action={logout}>
              <LogoutButton />
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

/** Kerangka back-office CMS. Token warnanya dapat di-override lewat [data-theme="cms"] di globals.css. */
export function CmsShell({ user, notice, children }: { user: CmsUser; notice?: React.ReactNode; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const current = activeItem(flattenNav(cmsNav), pathname);
  const section = current?.section ?? "CMS";

  // Sidebar tidak boleh terbuka dalam keadaan tergulir (mis. akibat scroll-into-view Next saat redirect login):
  // setelah navigasi, gulirkan hanya rail ini agar menu aktif terlihat, atau ke atas bila menu aktif sudah di atas.
  const rail = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    const fit = () => {
      const link = el.querySelector<HTMLElement>('[aria-current="page"]');
      if (!link) return void (el.scrollTop = 0);
      const box = el.getBoundingClientRect();
      const at = link.getBoundingClientRect();
      if (at.top < box.top + 120) el.scrollTop = Math.max(0, el.scrollTop - (box.top + 120 - at.top));
      else if (at.bottom > box.bottom - 24) el.scrollTop += at.bottom - box.bottom + 24;
    };
    fit();
    const frame = requestAnimationFrame(() => requestAnimationFrame(fit));
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  // Modal, sheet, dan toast dirender di luar shell (portal ke <body>), jadi tema CMS juga dipasang di <html>.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = "cms";
    return () => {
      delete root.dataset.theme;
    };
  }, []);

  return (
    <div data-theme="cms" className="min-h-svh bg-background lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
      <SkipLink />
      <aside aria-label="Menu CMS" className="hidden bg-sidebar lg:block">
        <div ref={rail} className="sticky top-0 h-svh overflow-y-auto overscroll-contain">
          <Sidebar user={user} />
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 bg-background/80 px-4 backdrop-blur-md lg:px-8">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Buka menu">
                <Icon icon={Menu01Icon} />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 overflow-y-auto overscroll-contain border-0 bg-sidebar p-0">
              <SheetTitle className="sr-only">Menu CMS</SheetTitle>
              <Sidebar user={user} onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <div className="min-w-0">
            <WordStagger as="h1" text={section} className="truncate text-lg font-bold tracking-tight" />
            {current?.description && <p className="hidden truncate text-xs text-muted-foreground sm:block">{current.description}</p>}
          </div>
          <Button asChild className="ml-auto rounded-full">
            <Link href="/">
              <Icon icon={ViewIcon} size={16} />
              <span className="hidden sm:inline">Lihat portal</span>
            </Link>
          </Button>
        </header>
        <main id={MAIN_CONTENT_ID} tabIndex={-1} className="mx-auto grid w-full max-w-[1280px] gap-5 px-4 pb-10 outline-none lg:px-8">
          {user.demo && (
            <Banner variant="warning" label="Demo">
              Login belum diwajibkan (<b>AUTH_REQUIRED</b> nonaktif), jadi CMS bisa dibuka tanpa akun.
            </Banner>
          )}
          {notice}
          {children}
        </main>
      </div>
      <AosInit />
    </div>
  );
}
