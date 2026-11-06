import { IntegrationDashboard } from "@/components/integrasi/integration-dashboard";
import { DashboardPage } from "@/components/portal/dashboard-page";
import { canReadSecurity } from "@/lib/integrasi/access";
import { loadPackedArchitecture } from "@/lib/integrasi/repo";
import { periodOptions } from "@/lib/probis/periods";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("/integrasi");
export default async function Page({ searchParams }: { searchParams: Promise<{ periode?: string }> }) {
  const [securityVisible, params, periods] = await Promise.all([canReadSecurity(), searchParams, periodOptions()]);
  const period = periods.periods.includes(params.periode ?? "") ? params.periode! : periods.active;
  const packed = await loadPackedArchitecture(securityVisible, period);
  return <DashboardPage path="/integrasi"><IntegrationDashboard packed={packed} periods={periods} /></DashboardPage>;
}
