import { Suspense } from "react";
import { DashboardSkeleton } from "@/components/blocks/dashboard-skeleton";
import { PetaRencanaDashboard } from "@/components/dashboards/peta-rencana-dashboard";
import { listPublicRencana } from "@/lib/peta-rencana/repo";
import { periodOptions } from "@/lib/probis/periods";
import { sampleActivePeriod, samplePeriods } from "@/lib/probis/reference";

/** Dashboard Peta Rencana: database bila sudah berisi, selain itu data contoh bawaan. */
export default async function Page() {
  let data: Awaited<ReturnType<typeof listPublicRencana>> | null = null;
  try {
    data = await listPublicRencana();
  } catch (error) {
    console.warn("Dashboard peta rencana memakai data contoh bawaan:", error instanceof Error ? error.message : error);
  }
  const fromDb = !!data?.rows.length;
  const periods = fromDb ? await periodOptions() : { periods: samplePeriods, active: sampleActivePeriod };
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <PetaRencanaDashboard data={fromDb ? data : null} sample={!fromDb || !!data?.sample} currentYear={new Date().getFullYear()} periods={periods} />
    </Suspense>
  );
}
