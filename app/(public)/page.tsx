import { OverviewDashboard } from "@/components/dashboards/overview-dashboard";
import { DashboardPage } from "@/components/portal/dashboard-page";
import { periodOptions } from "@/lib/probis/periods";
import { canReadSecurity } from "@/lib/integrasi/access";
import { loadOverview } from "@/lib/integrasi/repo";
import { pageMetadata } from "@/lib/seo";

const PATH = "/";
export const metadata = pageMetadata(PATH);

export default async function Home() {
  const securityVisible = await canReadSecurity();
  const [data, periods] = await Promise.all([loadOverview(securityVisible), periodOptions()]);
  return (
    <DashboardPage path={PATH}>
      <OverviewDashboard summary={data.summary} relations={data.relations} securityVisible={securityVisible} available={data.available} partial={false} periods={periods} />
    </DashboardPage>
  );
}
