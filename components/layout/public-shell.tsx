"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Login01Icon, Menu01Icon } from "@hugeicons/core-free-icons";
import { Logo } from "@/components/brand/logo";
import { Icon } from "@/components/icon";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { activeItem, portalSections, publicNav } from "@/lib/navigation";

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-8 px-4 py-6">
      <Logo className="px-1" />
      <SidebarNav items={publicNav} onNavigate={onNavigate} />
      <Button asChild variant="ghost" className="group mt-auto justify-start gap-3 px-3 text-sidebar-foreground hover:bg-sidebar-accent">
        <Link href="/login">
          <Icon icon={Login01Icon} />
          Masuk CMS
        </Link>
      </Button>
    </div>
  );
}

/** Kerangka portal publik: sidebar pastel, header ber-blur, area konten. */
export function PublicShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const section = activeItem(publicNav, pathname)?.section ?? portalSections[pathname] ?? "Arsitektur SPBE";

  return (
    <div className="min-h-svh lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
      <aside className="hidden bg-sidebar lg:block">
        <div className="sticky top-0 h-svh overflow-y-auto">
          <Sidebar />
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
              <SheetTitle className="sr-only">Menu navigasi</SheetTitle>
              <Sidebar onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold tracking-tight">{section}</h1>
            <p className="hidden text-xs text-muted-foreground sm:block">Arsitektur SPBE Kabupaten Gresik 2025–2029</p>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1440px] px-4 pb-10 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
