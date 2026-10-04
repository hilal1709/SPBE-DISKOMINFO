"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Logout01Icon, Menu01Icon, ViewIcon } from "@hugeicons/core-free-icons";
import { logout } from "@/app/actions/auth";
import { Banner } from "@/components/blocks/banner";
import { Logo } from "@/components/brand/logo";
import { Icon } from "@/components/icon";
import { SidebarNav, type NavBadges } from "@/components/layout/sidebar-nav";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { activeItem, cmsNav, flattenNav, navFor } from "@/lib/navigation";
import { initials } from "@/lib/roles";
import type { Role } from "@/lib/types";

export type CmsUser = { name: string; role: Role; roleLabel: string; opdName?: string | null; demo: boolean; badges?: NavBadges };

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
    <div className="flex h-full flex-col gap-8 px-4 py-6">
      <Logo href="/cms" subtitle="CMS · Kabupaten Gresik" className="px-1" />
      <SidebarNav items={navFor(cmsNav, user.role)} badges={user.badges} onNavigate={onNavigate} />
      <div className="mt-auto flex items-center gap-3 rounded-xl bg-card/70 p-2.5">
        <Avatar className="size-9">
          <AvatarFallback className="bg-brand-teal font-bold text-brand-charcoal">{initials(user.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-semibold">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.roleLabel}{user.opdName && ` · ${user.opdName}`}</p>
        </div>
        {!user.demo && (
          <form action={logout} className="ml-auto">
            <LogoutButton />
          </form>
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
      <aside className="hidden bg-sidebar lg:block">
        <div className="sticky top-0 h-svh overflow-y-auto">
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
            <SheetContent side="left" className="w-72 border-0 bg-sidebar p-0">
              <SheetTitle className="sr-only">Menu CMS</SheetTitle>
              <Sidebar user={user} onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold tracking-tight">{section}</h1>
            {current?.description && <p className="hidden truncate text-xs text-muted-foreground sm:block">{current.description}</p>}
          </div>
          <Button asChild className="ml-auto rounded-full">
            <Link href="/">
              <Icon icon={ViewIcon} size={16} />
              <span className="hidden sm:inline">Lihat portal</span>
            </Link>
          </Button>
        </header>
        <main className="mx-auto grid w-full max-w-[1280px] gap-5 px-4 pb-10 lg:px-8">
          {user.demo && (
            <Banner variant="warning" label="Demo">
              Login belum diwajibkan (<b>AUTH_REQUIRED</b> nonaktif), jadi CMS bisa dibuka tanpa akun.
            </Banner>
          )}
          {notice}
          {children}
        </main>
      </div>
    </div>
  );
}
