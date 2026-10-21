import { Suspense } from "react";
import { allInfrastruktur } from "@/lib/infrastruktur/generate";
import { DashboardSkeleton } from "@/components/blocks/dashboard-skeleton";
import { InfrastrukturDashboard } from "@/components/dashboards/infrastruktur-dashboard";
import { RaiProvider } from "@/components/infrastruktur/rai-context";
import { raiSetSafe } from "@/lib/infrastruktur/rai";
import { sampleRaiSet } from "@/lib/infrastruktur/reference";
import { listApprovedInfrastruktur } from "@/lib/infrastruktur/repo";
import { periodOptions } from "@/lib/probis/periods";
import { sampleActivePeriod, samplePeriods } from "@/lib/probis/reference";
import type { Infrastruktur } from "@/lib/types";

// Komponen tervalidasi dibaca ulang paling lama tiap menit.
export const revalidate = 60;

export default async function Page() {
  let approved: { rows: Infrastruktur[]; sample: boolean } = { rows: [], sample: true };
  try {
    approved = await listApprovedInfrastruktur();
  } catch (error) {
    console.warn("Dashboard infrastruktur memakai data contoh bawaan:", error instanceof Error ? error.message : error);
  }
  const fromDb = approved.rows.length > 0;
  const [periods, raiSet] = fromDb ? await Promise.all([periodOptions(), raiSetSafe()]) : [{ periods: samplePeriods, active: sampleActivePeriod }, sampleRaiSet];
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <RaiProvider set={raiSet}>
        <InfrastrukturDashboard data={fromDb ? approved.rows : allInfrastruktur()} sample={!fromDb || approved.sample} periods={periods} />
      </RaiProvider>
    </Suspense>
  );
}
