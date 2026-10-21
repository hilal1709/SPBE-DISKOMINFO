import { allInfrastruktur } from "@/lib/infrastruktur/generate";
import { InfrastrukturDashboard } from "@/components/dashboards/infrastruktur-dashboard";
import { RaiProvider } from "@/components/infrastruktur/rai-context";
import { DashboardPage } from "@/components/portal/dashboard-page";
import { raiSetSafe } from "@/lib/infrastruktur/rai";
import { sampleRaiSet } from "@/lib/infrastruktur/reference";
import { listApprovedInfrastruktur } from "@/lib/infrastruktur/repo";
import { periodOptions } from "@/lib/probis/periods";
import { readApproved, samplePeriodOptions } from "@/lib/portal/load";
import { pageMetadata } from "@/lib/seo";

const PATH = "/infrastruktur";
export const metadata = pageMetadata(PATH);

// Komponen tervalidasi dibaca ulang paling lama tiap menit.
export const revalidate = 60;

export default async function Page() {
  const approved = await readApproved("infrastruktur", listApprovedInfrastruktur);
  const fromDb = !!approved?.rows.length;
  const [periods, raiSet] = fromDb ? await Promise.all([periodOptions(), raiSetSafe()]) : [samplePeriodOptions, sampleRaiSet];
  return (
    <DashboardPage path={PATH}>
      <RaiProvider set={raiSet}>
        <InfrastrukturDashboard data={fromDb ? approved!.rows : allInfrastruktur()} sample={!fromDb || approved!.sample} periods={periods} />
      </RaiProvider>
    </DashboardPage>
  );
}
