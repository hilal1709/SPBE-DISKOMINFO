import { allAplikasi } from "@/lib/aplikasi/generate";
import { AplikasiDashboard } from "@/components/dashboards/aplikasi-dashboard";
import { DashboardPage } from "@/components/portal/dashboard-page";
import { listApprovedAplikasi } from "@/lib/aplikasi/repo";
import { periodOptions } from "@/lib/probis/periods";
import { readApproved, samplePeriodOptions } from "@/lib/portal/load";
import { pageMetadata } from "@/lib/seo";

const PATH = "/aplikasi";
export const metadata = pageMetadata(PATH);

// Aplikasi tervalidasi dibaca ulang paling lama tiap menit.
export const revalidate = 60;

export default async function Page() {
  const approved = await readApproved("aplikasi", listApprovedAplikasi);
  const fromDb = !!approved?.rows.length;
  const periods = fromDb ? await periodOptions() : samplePeriodOptions;
  return (
    <DashboardPage path={PATH}>
      <AplikasiDashboard data={fromDb ? approved!.rows : allAplikasi()} sample={!fromDb || approved!.sample} periods={periods} />
    </DashboardPage>
  );
}
