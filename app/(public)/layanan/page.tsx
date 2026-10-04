import { Suspense } from "react";
import { DashboardSkeleton } from "@/components/blocks/dashboard-skeleton";
import { ServiceDashboard } from "@/components/dashboards/service-dashboard";
import { RalProvider } from "@/components/layanan/ral-context";
import { ralSetSafe } from "@/lib/layanan/ral";
import { sampleRalSet } from "@/lib/layanan/reference";
import { listApprovedServices } from "@/lib/layanan/repo";
import { periodOptions } from "@/lib/probis/periods";
import { sampleActivePeriod, samplePeriods } from "@/lib/probis/reference";
import type { Layanan } from "@/lib/types";

// Layanan disetujui dibaca ulang paling lama tiap menit.
export const revalidate = 60;

export default async function Page() {
  let approved: { rows: Layanan[]; sample: boolean } = { rows: [], sample: true };
  try {
    approved = await listApprovedServices();
  } catch (error) {
    console.warn("Dashboard layanan memakai data contoh bawaan:", error instanceof Error ? error.message : error);
  }
  const fromDb = approved.rows.length > 0;
  const [periods, ralSet] = fromDb ? await Promise.all([periodOptions(), ralSetSafe()]) : [{ periods: samplePeriods, active: sampleActivePeriod }, sampleRalSet];
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <RalProvider set={ralSet}>
        <ServiceDashboard data={fromDb ? approved.rows : null} sample={!fromDb || approved.sample} periods={periods} />
      </RalProvider>
    </Suspense>
  );
}
