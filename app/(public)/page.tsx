import { pack } from "@/lib/pack";
import { allProbis } from "@/lib/probis/generate";
import { BusinessProcessDashboard } from "@/components/dashboards/business-process-dashboard";
import { DashboardPage } from "@/components/portal/dashboard-page";
import { periodOptions } from "@/lib/probis/periods";
import { RabProvider } from "@/components/probis/rab-context";
import { rabSetSafe } from "@/lib/probis/rab";
import { sampleRabSet } from "@/lib/probis/sample-reference";
import { listApproved } from "@/lib/probis/repo";
import { readApproved, samplePeriodOptions } from "@/lib/portal/load";
import { pageMetadata } from "@/lib/seo";

const PATH = "/";
export const metadata = pageMetadata(PATH);

// Data probis tervalidasi dibaca ulang paling lama tiap menit (juga di-revalidate saat CMS menyimpan).
export const revalidate = 60;

export default async function Home() {
  const approved = await readApproved("proses bisnis", listApproved);
  const fromDb = !!approved?.rows.rows.length;
  const [periods, rabSet] = fromDb ? await Promise.all([periodOptions(), rabSetSafe()]) : [samplePeriodOptions, sampleRabSet];
  return (
    <DashboardPage path={PATH}>
      <RabProvider set={rabSet}>
        <BusinessProcessDashboard data={fromDb ? approved!.rows : pack(allProbis())} sample={!fromDb || approved!.sample} periods={periods} />
      </RabProvider>
    </DashboardPage>
  );
}
