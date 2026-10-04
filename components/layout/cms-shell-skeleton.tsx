import { DashboardSkeleton } from "@/components/blocks/dashboard-skeleton";
import { LogoMark } from "@/components/brand/logo";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Kerangka CMS yang tampil seketika (tanpa menunggu sesi & database) selama CmsShell disiapkan.
 * Tata letaknya sama dengan CmsShell agar tidak ada lompatan saat konten asli masuk.
 */
export function CmsShellSkeleton() {
  return (
    <div data-theme="cms" className="min-h-svh bg-background lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
      <aside aria-hidden className="hidden bg-sidebar lg:block">
        <div className="sticky top-0 flex h-svh flex-col gap-8 px-4 py-6">
          <div className="flex items-center gap-3 px-1">
            <LogoMark />
            <span className="leading-tight">
              <span className="block text-[15px] font-extrabold tracking-tight">Arsitektur SPBE</span>
              <span className="block text-xs text-muted-foreground">CMS · Kabupaten Gresik</span>
            </span>
          </div>
          <div className="grid gap-2">
            {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-9 rounded-xl bg-sidebar-accent" />)}
          </div>
          <Skeleton className="mt-auto h-14 rounded-xl bg-card/70" />
        </div>
      </aside>
      <div className="min-w-0">
        <header aria-hidden className="flex h-16 items-center gap-3 px-4 lg:px-8">
          <Skeleton className="h-6 w-48 rounded-lg" />
          <Skeleton className="ml-auto h-9 w-32 rounded-full" />
        </header>
        <main className="mx-auto w-full max-w-[1280px] px-4 pb-10 lg:px-8">
          <DashboardSkeleton label="Memuat CMS" />
        </main>
      </div>
    </div>
  );
}
