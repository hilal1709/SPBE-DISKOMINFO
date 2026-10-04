import { Suspense } from "react";
import { DashboardSkeleton } from "@/components/blocks/dashboard-skeleton";
import { DataDashboard } from "@/components/dashboards/data-dashboard";
import { sampleActivePeriod, samplePeriods } from "@/lib/probis/reference";

/** Domain Data memakai data contoh sampai modul CMS Data tersedia. */
export default function Page() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DataDashboard data={null} sample periods={{ periods: samplePeriods, active: sampleActivePeriod }} />
    </Suspense>
  );
}
