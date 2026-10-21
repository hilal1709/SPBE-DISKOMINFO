import { RencanaList } from "@/components/cms/peta-rencana/rencana-list";
import { can, currentActor } from "@/lib/access";
import { gapSummary } from "@/lib/gap/cms-repo";
import { listRencana } from "@/lib/peta-rencana/cms-repo";
import { periodOptions } from "@/lib/probis/periods";

export default async function RencanaListPage() {
  const [actor, rows, periods, gaps] = await Promise.all([currentActor(), listRencana(), periodOptions(), gapSummary().catch(() => null)]);
  return <RencanaList rows={rows} periods={periods} canManage={can.manageRencana(actor)} canExport={can.export(actor)} openHighGaps={gaps?.openHigh ?? 0} />;
}
