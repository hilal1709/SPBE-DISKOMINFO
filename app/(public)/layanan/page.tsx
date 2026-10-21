import { allLayanan } from "@/lib/layanan/generate";
import { ServiceDashboard } from "@/components/dashboards/service-dashboard";
import { RalProvider } from "@/components/layanan/ral-context";
import { DashboardPage } from "@/components/portal/dashboard-page";
import { RabProvider } from "@/components/probis/rab-context";
import { rabSetSafe } from "@/lib/probis/rab";
import { sampleRabSet } from "@/lib/probis/sample-reference";
import { ralSetSafe } from "@/lib/layanan/ral";
import { sampleRalSet } from "@/lib/layanan/sample-reference";
import { listApprovedServices } from "@/lib/layanan/repo";
import { periodOptions } from "@/lib/probis/periods";
import { readApproved, samplePeriodOptions } from "@/lib/portal/load";
import { pageMetadata } from "@/lib/seo";

const PATH = "/layanan";
export const metadata = pageMetadata(PATH);

// Layanan disetujui dibaca ulang paling lama tiap menit.
export const revalidate = 60;

export default async function Page() {
  const approved = await readApproved("layanan", listApprovedServices);
  const fromDb = !!approved?.rows.length;
  const [periods, ralSet, rabSet] = fromDb
    ? await Promise.all([periodOptions(), ralSetSafe(), rabSetSafe()])
    : [samplePeriodOptions, sampleRalSet, sampleRabSet];
  return (
    <DashboardPage path={PATH}>
      <RabProvider set={rabSet}>
        <RalProvider set={ralSet}>
          <ServiceDashboard data={fromDb ? approved!.rows : allLayanan()} sample={!fromDb || approved!.sample} periods={periods} />
        </RalProvider>
      </RabProvider>
    </DashboardPage>
  );
}
