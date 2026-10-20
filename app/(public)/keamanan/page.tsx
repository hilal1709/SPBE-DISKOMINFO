import Link from "next/link";
import { Suspense } from "react";
import { auth } from "@/auth";
import { DashboardSkeleton } from "@/components/blocks/dashboard-skeleton";
import { EmptyState } from "@/components/blocks/empty-state";
import { KeamananDashboard } from "@/components/dashboards/keamanan-dashboard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { listApprovedKeamanan, securityCoverage, type Coverage } from "@/lib/keamanan/repo";
import { can } from "@/lib/permissions";
import { periodOptions } from "@/lib/probis/periods";
import { sampleActivePeriod, samplePeriods } from "@/lib/probis/reference";
import type { KegiatanKeamanan } from "@/lib/types";

/**
 * Dashboard Keamanan: wajib login (proxy.ts mengarahkan pengunjung ke /login) dan hanya untuk tim Diskominfo & pimpinan.
 * Sesi dibaca langsung dari Auth.js, bukan `currentActor`, agar mode demo CMS tidak membuka halaman ini.
 */
export default async function Page() {
  const session = await auth();
  const user = session?.user;
  if (!user || !can.viewKeamanan({ id: user.id, name: user.name ?? "", role: user.role, opdId: user.opdId ?? null, demo: false })) {
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
    approved = await listApprovedKeamanan();
    if (approved.rows.length) coverage = await securityCoverage();
  } catch (error) {
    console.warn("Dashboard keamanan memakai data contoh bawaan:", error instanceof Error ? error.message : error);
  }
  const fromDb = approved.rows.length > 0;
  const periods = fromDb ? await periodOptions() : { periods: samplePeriods, active: sampleActivePeriod };
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <KeamananDashboard data={fromDb ? approved.rows : null} coverage={coverage} sample={!fromDb || approved.sample} periods={periods} />
    </Suspense>
  );
}
