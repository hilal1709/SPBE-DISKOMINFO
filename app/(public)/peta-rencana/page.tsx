import { allRencana } from "@/lib/peta-rencana/generate";
import { PetaRencanaDashboard } from "@/components/dashboards/peta-rencana-dashboard";
import { DashboardPage } from "@/components/portal/dashboard-page";
import { listPublicRencana } from "@/lib/peta-rencana/repo";
import { periodOptions } from "@/lib/probis/periods";
import { readApproved, samplePeriodOptions } from "@/lib/portal/load";
import { pageMetadata } from "@/lib/seo";

const PATH = "/peta-rencana";
export const metadata = pageMetadata(PATH);

// Rencana dibaca ulang paling lama tiap menit (juga di-revalidate saat CMS menyimpan).
export const revalidate = 60;

/** Dashboard Peta Rencana: database bila sudah berisi, selain itu data contoh bawaan. */
export default async function Page() {
  const data = await readApproved("peta rencana", listPublicRencana);
  const fromDb = !!data?.rows.length;
  const periods = fromDb ? await periodOptions() : samplePeriodOptions;
  return (
    <DashboardPage path={PATH}>
      <PetaRencanaDashboard data={fromDb ? data! : allRencana()} sample={!fromDb || !!data?.sample} currentYear={new Date().getFullYear()} periods={periods} />
    </DashboardPage>
  );
}
