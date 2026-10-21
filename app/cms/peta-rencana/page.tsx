import { RencanaList } from "@/components/cms/peta-rencana/rencana-list";
import { can, currentActor } from "@/lib/access";
import { listRencana } from "@/lib/peta-rencana/cms-repo";
import { periodOptions } from "@/lib/probis/periods";

export default async function RencanaListPage() {
  const [actor, rows, periods] = await Promise.all([currentActor(), listRencana(), periodOptions()]);
  return <RencanaList rows={rows} periods={periods} canManage={can.manageRencana(actor)} canExport={can.export(actor)} />;
}
