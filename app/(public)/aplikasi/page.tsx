import { Suspense } from "react";
import { allAplikasi } from "@/lib/aplikasi/generate";
import { DashboardSkeleton } from "@/components/blocks/dashboard-skeleton";
import { AplikasiDashboard } from "@/components/dashboards/aplikasi-dashboard";
import { listApprovedAplikasi } from "@/lib/aplikasi/repo";
import { periodOptions } from "@/lib/probis/periods";
import { sampleActivePeriod, samplePeriods } from "@/lib/probis/reference";
import type { Aplikasi } from "@/lib/types";

// Aplikasi tervalidasi dibaca ulang paling lama tiap menit.
export const revalidate = 60;

export default async function Page() {
  let approved: { rows: Aplikasi[]; sample: boolean } = { rows: [], sample: true };
  try {
    approved = await listApprovedAplikasi();
  } catch (error) {
    console.warn("Dashboard aplikasi memakai data contoh bawaan:", error instanceof Error ? error.message : error);
  }
  const fromDb = approved.rows.length > 0;
  const periods = fromDb ? await periodOptions() : { periods: samplePeriods, active: sampleActivePeriod };
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <AplikasiDashboard data={fromDb ? approved.rows : allAplikasi()} sample={!fromDb || approved.sample} periods={periods} />
    </Suspense>
  );
}
