import { IntegrationDashboard } from "@/components/integrasi/integration-dashboard";
import { DashboardPage } from "@/components/portal/dashboard-page";
import { canReadSecurity } from "@/lib/integrasi/access";
import { loadArchitecture } from "@/lib/integrasi/repo";
import { periodOptions } from "@/lib/probis/periods";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("/integrasi");
export default async function Page({ searchParams }: { searchParams: Promise<{ periode?: string }> }) {
  const securityVisible = await canReadSecurity();
  const [params, periods] = await Promise.all([searchParams, periodOptions()]);
  const period = periods.periods.includes(params.periode ?? "") ? params.periode! : periods.active;
  const data = await loadArchitecture(securityVisible, period);
  return <DashboardPage path="/integrasi"><IntegrationDashboard data={data} periods={periods} /></DashboardPage>;
}
