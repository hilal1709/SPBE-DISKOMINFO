import { Suspense } from "react";
import { DashboardSkeleton } from "@/components/blocks/dashboard-skeleton";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";

/** Kerangka halaman dashboard portal: remah roti untuk mesin pencari + skeleton saat dashboard dimuat. */
export function DashboardPage({ path, children }: { path: string; children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbJsonLd path={path} />
      <Suspense fallback={<DashboardSkeleton />}>{children}</Suspense>
    </>
  );
}
