import { Suspense } from "react";
import { DashboardSkeleton } from "@/components/blocks/dashboard-skeleton";
import { ServiceDashboard } from "@/components/dashboards/service-dashboard";
import { listApprovedServices } from "@/lib/layanan/repo";
import { periodOptions } from "@/lib/probis/periods";
import { sampleActivePeriod, samplePeriods } from "@/lib/probis/reference";
import type { Layanan } from "@/lib/types";

// Layanan disetujui dibaca ulang paling lama tiap menit.
export const revalidate = 60;

export default async function Page() {
  let rows: Layanan[] = [];
  try {
    rows = await listApprovedServices();
  } catch (error) {
    console.warn("Dashboard layanan memakai data contoh bawaan:", error instanceof Error ? error.message : error);
  }
  const fromDb = rows.length > 0;
  const periods = fromDb ? await periodOptions() : { periods: samplePeriods, active: sampleActivePeriod };
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <ServiceDashboard data={fromDb ? rows : null} sample={!fromDb} periods={periods} />
    </Suspense>
  );
}
