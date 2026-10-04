"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Logout01Icon, Menu01Icon, ViewIcon } from "@hugeicons/core-free-icons";
import { logout } from "@/app/actions/auth";
import { Icon } from "@/components/icon";
import { Brand } from "@/components/layout/brand";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { activeItem, cmsNav } from "@/lib/navigation";
import { initials } from "@/lib/roles";

export type CmsUser = { name: string; roleLabel: string; demo: boolean };

function LogoutButton() {
  const { pending } = useFormStatus();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="submit" size="icon" variant="ghost" loading={pending} aria-label="Keluar" className="text-panel-muted hover:bg-panel-accent hover:text-white">
          {!pending && <Icon icon={Logout01Icon} />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>Keluar</TooltipContent>
    </Tooltip>
  );
}

function Sidebar({ user, onNavigate }: { user: CmsUser; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-6 bg-panel p-4 text-panel-foreground">
      <div className="px-1 pt-2">
        <Brand tone="dark" title="CMS SPBE" href="/cms" />
      </div>
      <div>
        <p className="mb-2 px-3 text-[11px] font-semibold tracking-[0.06em] text-panel-muted uppercase">Kelola</p>
        <SidebarNav items={cmsNav} tone="dark" onNavigate={onNavigate} />
      </div>
      <div className="mt-auto flex items-center gap-3 rounded-xl bg-panel-accent p-3">
        <Avatar className="size-9">
          <AvatarFallback className="bg-primary font-bold text-primary-foreground">{initials(user.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-semibold text-white">{user.name}</p>
          <p className="truncate text-xs text-panel-muted">{user.roleLabel}</p>
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

/** Kerangka back-office CMS dengan sidebar navy. */
export function CmsShell({ user, children }: { user: CmsUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const section = activeItem(cmsNav, pathname)?.section ?? "CMS";

  return (
    <div className="min-h-svh lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      <aside className="hidden lg:block">
        <div className="sticky top-0 h-svh overflow-y-auto">
          <Sidebar user={user} />
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-md lg:px-8">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Buka menu">
                <Icon icon={Menu01Icon} />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 border-0 p-0">
              <SheetTitle className="sr-only">Menu CMS</SheetTitle>
              <Sidebar user={user} onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <div className="min-w-0">
            <p className="eyebrow">Back-office</p>
            <p className="truncate text-sm font-bold sm:text-base">{section}</p>
          </div>
          <Button asChild variant="outline" className="ml-auto">
            <Link href="/">
              <Icon icon={ViewIcon} size={16} />
              <span className="hidden sm:inline">Lihat portal</span>
            </Link>
          </Button>
        </header>
        {user.demo && (
          <p className="border-b bg-warning-soft px-4 py-2 text-xs text-warning lg:px-8">
            Mode demo: <b>AUTH_REQUIRED</b> tidak aktif, sehingga CMS dapat dibuka tanpa login.
          </p>
        )}
        <main className="mx-auto w-full max-w-[1280px] p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
