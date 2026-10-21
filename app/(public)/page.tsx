import { Suspense } from "react";
import { pack } from "@/lib/pack";
import { allProbis } from "@/lib/probis/generate";
import { DashboardSkeleton } from "@/components/blocks/dashboard-skeleton";
import { BusinessProcessDashboard } from "@/components/dashboards/business-process-dashboard";
import { periodOptions } from "@/lib/probis/periods";
import { RabProvider } from "@/components/probis/rab-context";
import { rabSetSafe } from "@/lib/probis/rab";
import { sampleActivePeriod, samplePeriods } from "@/lib/probis/reference";
import { sampleRabSet } from "@/lib/probis/sample-reference";
import { listApproved } from "@/lib/probis/repo";

// Data probis tervalidasi dibaca ulang paling lama tiap menit (juga di-revalidate saat CMS menyimpan).
export const revalidate = 60;

export default async function Home() {
  let approved: Awaited<ReturnType<typeof listApproved>> | null = null;
  try {
    approved = await listApproved();
  } catch (error) {
    console.warn("Dashboard publik memakai data contoh bawaan:", error instanceof Error ? error.message : error);
  }
  const fromDb = !!approved?.rows.rows.length;
  const [periods, rabSet] = fromDb ? await Promise.all([periodOptions(), rabSetSafe()]) : [{ periods: samplePeriods, active: sampleActivePeriod }, sampleRabSet];
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <RabProvider set={rabSet}>
        <BusinessProcessDashboard data={fromDb ? approved!.rows : pack(allProbis())} sample={!fromDb || approved!.sample} periods={periods} />
      </RabProvider>
    </Suspense>
  );
}
