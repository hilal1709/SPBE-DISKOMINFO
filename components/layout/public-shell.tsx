"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Login01Icon, Menu01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/icon";
import { Brand } from "@/components/layout/brand";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { activeItem, portalSections, publicNav } from "@/lib/navigation";

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <div className="px-1 pt-2">
        <Brand />
      </div>
      <div>
        <p className="eyebrow mb-2 px-3">Domain arsitektur</p>
        <SidebarNav items={publicNav} onNavigate={onNavigate} />
      </div>
      <div className="mt-auto rounded-xl border bg-accent/60 p-4">
        <p className="text-sm font-semibold">Pengelola data OPD?</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Masuk ke CMS untuk mengajukan dan memverifikasi arsitektur.</p>
        <Button asChild className="group mt-3 w-full">
          <Link href="/login">
            Masuk CMS
            <Icon icon={Login01Icon} size={16} className="transition-transform duration-300 ease-(--ease-out) group-hover:translate-x-0.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

/** Kerangka portal publik: sidebar domain, header ber-blur, area konten. */
export function PublicShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const section = activeItem(publicNav, pathname)?.section ?? portalSections[pathname] ?? "Arsitektur SPBE";

  return (
    <div className="min-h-svh lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="hidden border-r bg-sidebar lg:block">
        <div className="sticky top-0 h-svh overflow-y-auto">
          <Sidebar />
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
            <SheetContent side="left" className="w-72 bg-sidebar p-0">
              <SheetTitle className="sr-only">Menu navigasi</SheetTitle>
              <Sidebar onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <div className="min-w-0">
            <p className="eyebrow truncate">{section}</p>
            <p className="truncate text-sm font-bold sm:text-base">Arsitektur SPBE Kabupaten Gresik 2025–2029</p>
          </div>
          <Badge variant="outline" className="ml-auto hidden h-8 rounded-lg bg-card px-3 text-xs sm:inline-flex">
            Tahun perencanaan <b className="font-semibold">2025–2029</b>
          </Badge>
        </header>
        <main className="mx-auto w-full max-w-[1440px] p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
