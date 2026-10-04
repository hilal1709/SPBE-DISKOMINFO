import { Suspense } from "react";
import { DashboardSkeleton } from "@/components/blocks/dashboard-skeleton";
import { BusinessProcessDashboard } from "@/components/dashboards/business-process-dashboard";
import { periodOptions } from "@/lib/probis/periods";
import { RabProvider } from "@/components/probis/rab-context";
import { rabSetSafe } from "@/lib/probis/rab";
import { sampleActivePeriod, samplePeriods, sampleRabSet } from "@/lib/probis/reference";
import { listApproved } from "@/lib/probis/repo";

// Data probis tervalidasi dibaca ulang paling lama tiap menit (juga di-revalidate saat CMS menyimpan).
export const revalidate = 60;

export default async function Home() {
  let approved: Awaited<ReturnType<typeof listApproved>> = { rows: [], sample: true };
  try {
    approved = await listApproved();
  } catch (error) {
    console.warn("Dashboard publik memakai data contoh bawaan:", error instanceof Error ? error.message : error);
  }
  const fromDb = approved.rows.length > 0;
  const [periods, rabSet] = fromDb ? await Promise.all([periodOptions(), rabSetSafe()]) : [{ periods: samplePeriods, active: sampleActivePeriod }, sampleRabSet];
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <RabProvider set={rabSet}>
        <BusinessProcessDashboard data={fromDb ? approved.rows : null} sample={!fromDb || approved.sample} periods={periods} />
      </RabProvider>
    </Suspense>
  );
}
