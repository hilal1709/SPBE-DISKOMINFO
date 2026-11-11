import { Suspense } from "react";
import { allKeamanan, sampleCoverage } from "@/lib/keamanan/generate";
import { DashboardSkeleton } from "@/components/blocks/dashboard-skeleton";
import { KeamananDashboard } from "@/components/dashboards/keamanan-dashboard";
import { listApprovedKeamanan, securityCoverage, type Coverage } from "@/lib/keamanan/repo";
import { periodOptions } from "@/lib/probis/periods";
import { samplePeriodOptions } from "@/lib/portal/load";
import { pageMetadata } from "@/lib/seo";
import type { KegiatanKeamanan } from "@/lib/types";

// Tidak diindeks mesin pencari.
export const metadata = pageMetadata("/keamanan");

/** Dashboard Keamanan: terbuka bagi semua pengguna portal karena web SPBE dipakai internal. */
export default async function Page() {
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
