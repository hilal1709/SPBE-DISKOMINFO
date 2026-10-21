"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { DashboardSquare01Icon, Login01Icon, Menu01Icon } from "@hugeicons/core-free-icons";
import { Logo } from "@/components/brand/logo";
import { Icon } from "@/components/icon";
import { UrlParamsBoundary } from "@/hooks/use-url-params";
import { AosInit } from "@/components/motion/aos";
import { WordStagger } from "@/components/motion/word-stagger";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { SiteFooter } from "@/components/layout/site-footer";
import { SkipLink } from "@/components/layout/skip-link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { activeItem, portalSections, publicNav } from "@/lib/navigation";
import { MAIN_CONTENT_ID } from "@/lib/constants";
import { siteConfig } from "@/lib/site";

/** Sesi dibaca sekali per kunjungan (tanpa pustaka klien next-auth), setelah halaman tampil. */
let session: Promise<boolean> | undefined;
const readSession = () =>
  (session ??= fetch("/api/auth/session")
    .then((r) => (r.ok ? r.json() : null))
    .then((s) => !!s?.user)
    .catch(() => false));

function useSignedIn() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    let active = true;
    readSession().then((value) => active && setSignedIn(value));
    return () => {
      active = false;
    };
  }, []);
  return signedIn;
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  // Status login dibaca di klien agar halaman portal tetap statis.
  const signedIn = useSignedIn();
  return (
    <div className="flex min-h-full shrink-0 flex-col gap-8 px-4 py-6">
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

/** Kerangka portal publik: tautan lewati menu, sidebar pastel, header ber-blur, area konten, footer. */
export function PublicShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const section = activeItem(publicNav, pathname)?.section ?? portalSections[pathname] ?? "Arsitektur SPBE";

  return (
    <div className="min-h-svh lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
      <SkipLink />
      <aside aria-label="Menu portal" className="hidden bg-sidebar lg:block">
        <div className="sticky top-0 h-svh overflow-y-auto overscroll-contain">
          <Sidebar />
        </div>
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 bg-background/80 px-4 backdrop-blur-md lg:px-8">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Buka menu">
                <Icon icon={Menu01Icon} />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 overflow-y-auto overscroll-contain border-0 bg-sidebar p-0">
              <SheetTitle className="sr-only">Menu navigasi</SheetTitle>
              <Sidebar onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <div className="min-w-0">
            <WordStagger as="h1" text={section} className="truncate text-lg font-bold tracking-tight" />
            <p className="hidden text-xs text-muted-foreground sm:block">{siteConfig.tagline}</p>
          </div>
        </header>
        <main id={MAIN_CONTENT_ID} tabIndex={-1} className="mx-auto w-full max-w-[1440px] flex-1 px-4 pb-10 outline-none lg:px-8">
          <UrlParamsBoundary>{children}</UrlParamsBoundary>
        </main>
        <SiteFooter />
      </div>
      <AosInit />
    </div>
  );
}
