import { Suspense } from "react";
import { DashboardSkeleton } from "@/components/blocks/dashboard-skeleton";
import { DataDashboard } from "@/components/dashboards/data-dashboard";
import { RadProvider } from "@/components/data/rad-context";
import { radSetSafe } from "@/lib/data/rad";
import { sampleRadSet } from "@/lib/data/reference";
import { listApprovedData } from "@/lib/data/repo";
import { periodOptions } from "@/lib/probis/periods";
import { sampleActivePeriod, samplePeriods } from "@/lib/probis/reference";
import type { DataInfo } from "@/lib/types";

// Data disetujui dibaca ulang paling lama tiap menit.
export const revalidate = 60;

export default async function Page() {
  let approved: { rows: DataInfo[]; sample: boolean } = { rows: [], sample: true };
  try {
    approved = await listApprovedData();
  } catch (error) {
    console.warn("Dashboard data memakai data contoh bawaan:", error instanceof Error ? error.message : error);
  }
  const fromDb = approved.rows.length > 0;
  const [periods, radSet] = fromDb ? await Promise.all([periodOptions(), radSetSafe()]) : [{ periods: samplePeriods, active: sampleActivePeriod }, sampleRadSet];
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <RadProvider set={radSet}>
        <DataDashboard data={fromDb ? approved.rows : null} sample={!fromDb || approved.sample} periods={periods} />
      </RadProvider>
    </Suspense>
  );
}
