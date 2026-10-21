import { Suspense } from "react";
import { allLayanan } from "@/lib/layanan/generate";
import { DashboardSkeleton } from "@/components/blocks/dashboard-skeleton";
import { ServiceDashboard } from "@/components/dashboards/service-dashboard";
import { RalProvider } from "@/components/layanan/ral-context";
import { RabProvider } from "@/components/probis/rab-context";
import { rabSetSafe } from "@/lib/probis/rab";
import { sampleRabSet } from "@/lib/probis/sample-reference";
import { ralSetSafe } from "@/lib/layanan/ral";
import { sampleRalSet } from "@/lib/layanan/sample-reference";
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
  const [periods, ralSet, rabSet] = fromDb
    ? await Promise.all([periodOptions(), ralSetSafe(), rabSetSafe()])
    : [{ periods: samplePeriods, active: sampleActivePeriod }, sampleRalSet, sampleRabSet];
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <RabProvider set={rabSet}>
      <RalProvider set={ralSet}>
        <ServiceDashboard data={fromDb ? approved.rows : allLayanan()} sample={!fromDb || approved.sample} periods={periods} />
      </RalProvider>
      </RabProvider>
    </Suspense>
  );
}
