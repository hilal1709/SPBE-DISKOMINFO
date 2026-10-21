import { IndicatorEditor } from "@/components/cms/peta-rencana/indicator-editor";
import { NoAccess } from "@/components/cms/no-access";
import { can, currentActor } from "@/lib/access";
import { listIndicatorsCms } from "@/lib/peta-rencana/cms-repo";
import { periodOptions } from "@/lib/probis/periods";

export default async function RencanaIndicatorPage() {
  const actor = await currentActor();
  if (!can.manageRencana(actor)) return <NoAccess />;
  const [rows, periods] = await Promise.all([listIndicatorsCms(), periodOptions()]);
  return <IndicatorEditor rows={rows} periods={periods} canManage />;
}
