import Link from "next/link";
import { Suspense } from "react";
import { allKeamanan, sampleCoverage } from "@/lib/keamanan/generate";
import { auth } from "@/auth";
import { DashboardSkeleton } from "@/components/blocks/dashboard-skeleton";
import { EmptyState } from "@/components/blocks/empty-state";
import { KeamananDashboard } from "@/components/dashboards/keamanan-dashboard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { listApprovedKeamanan, securityCoverage, type Coverage } from "@/lib/keamanan/repo";
import { actorFor, can } from "@/lib/access";
import { periodOptions } from "@/lib/probis/periods";
import { samplePeriodOptions } from "@/lib/portal/load";
import { pageMetadata } from "@/lib/seo";
import type { KegiatanKeamanan } from "@/lib/types";

// Wajib login: tidak diindeks mesin pencari.
export const metadata = pageMetadata("/keamanan");

/**
 * Dashboard Keamanan: wajib login (proxy.ts mengarahkan pengunjung ke /login) dan hanya untuk tim Diskominfo & pimpinan.
 * Sesi dibaca langsung dari Auth.js, bukan `currentActor`, agar mode demo CMS tidak membuka halaman ini.
 */
export default async function Page() {
  const session = await auth();
  const actor = session?.user ? await actorFor(session.user) : null;
  if (!actor || !can.viewKeamanan(actor)) {
    return (
      <Card className="mt-2">
        <EmptyState illustration="security-shield" title="Halaman ini untuk tim Diskominfo dan pimpinan" description="Data keamanan SPBE hanya dapat dilihat akun Diskominfo dan pimpinan. Hubungi admin Diskominfo bila Anda memerlukan akses.">
          <Button asChild variant="outline">
            <Link href="/">Kembali ke portal</Link>
          </Button>
        </EmptyState>
      </Card>
    );
  }

  let approved: { rows: KegiatanKeamanan[]; sample: boolean } = { rows: [], sample: true };
  let coverage: Coverage | null = null;
  try {
    // Keduanya ber-cache dan saling lepas: dibaca bersamaan.
    [approved, coverage] = await Promise.all([listApprovedKeamanan(), securityCoverage()]);
    if (!approved.rows.length) coverage = null;
  } catch (error) {
    console.warn("Dashboard keamanan memakai data contoh bawaan:", error instanceof Error ? error.message : error);
  }
  const fromDb = approved.rows.length > 0;
  const periods = fromDb ? await periodOptions() : samplePeriodOptions;
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <KeamananDashboard data={fromDb ? approved.rows : allKeamanan()} coverage={coverage ?? sampleCoverage()} sample={!fromDb || approved.sample} periods={periods} />
    </Suspense>
  );
}
