"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SessionProvider, useSession } from "next-auth/react";
import { DashboardSquare01Icon, Login01Icon, Menu01Icon } from "@hugeicons/core-free-icons";
import { Logo } from "@/components/brand/logo";
import { Icon } from "@/components/icon";
import { AosInit } from "@/components/motion/aos";
import { WordStagger } from "@/components/motion/word-stagger";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { activeItem, portalSections, publicNav } from "@/lib/navigation";

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  // Status login dibaca di klien agar halaman portal tetap statis.
  const signedIn = useSession().status === "authenticated";
  return (
    <div className="flex h-full flex-col gap-8 px-4 py-6">
      <Logo className="px-1" />
      <SidebarNav items={publicNav} onNavigate={onNavigate} signedIn={signedIn} />
      <Button asChild variant="ghost" className="group mt-auto justify-start gap-3 px-3 text-sidebar-foreground hover:bg-sidebar-accent">
        <Link href={signedIn ? "/cms" : "/login"}>
          <Icon icon={signedIn ? DashboardSquare01Icon : Login01Icon} />
          {signedIn ? "Buka CMS" : "Masuk CMS"}
        </Link>
      </Button>
    </div>
  );
}

/** Kerangka portal publik: sidebar pastel, header ber-blur, area konten. */
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <Shell>{children}</Shell>
    </SessionProvider>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
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
            <WordStagger as="h1" text={section} className="truncate text-lg font-bold tracking-tight" />
            <p className="hidden text-xs text-muted-foreground sm:block">Arsitektur SPBE Kabupaten Gresik 2025–2029</p>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1440px] px-4 pb-10 lg:px-8">{children}</main>
      </div>
      <AosInit />
    </div>
  );
}
