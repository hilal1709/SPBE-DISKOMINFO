import { allData } from "@/lib/data/generate";
import { DataDashboard } from "@/components/dashboards/data-dashboard";
import { RadProvider } from "@/components/data/rad-context";
import { DashboardPage } from "@/components/portal/dashboard-page";
import { radSetSafe } from "@/lib/data/rad";
import { sampleRadSet } from "@/lib/data/sample-reference";
import { listApprovedData } from "@/lib/data/repo";
import { periodOptions } from "@/lib/probis/periods";
import { readApproved, samplePeriodOptions } from "@/lib/portal/load";
import { pageMetadata } from "@/lib/seo";

const PATH = "/data";
export const metadata = pageMetadata(PATH);

// Data disetujui dibaca ulang paling lama tiap menit.
export const revalidate = 60;

export default async function Page() {
  const approved = await readApproved("data", listApprovedData);
  const fromDb = !!approved?.rows.length;
  const [periods, radSet] = fromDb ? await Promise.all([periodOptions(), radSetSafe()]) : [samplePeriodOptions, sampleRadSet];
  return (
    <DashboardPage path={PATH}>
      <RadProvider set={radSet}>
        <DataDashboard data={fromDb ? approved!.rows : allData()} sample={!fromDb || approved!.sample} periods={periods} />
      </RadProvider>
    </DashboardPage>
  );
}
