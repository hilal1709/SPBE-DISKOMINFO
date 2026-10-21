import { GapDashboard } from "@/components/cms/gap/gap-dashboard";
import { NoAccess } from "@/components/cms/no-access";
import { can, currentActor } from "@/lib/access";
import { listGaps } from "@/lib/gap/cms-repo";
import { pack } from "@/lib/pack";
import { periodOptions } from "@/lib/probis/periods";

/** Gap Analysis: dikelola Admin Operator Diskominfo; tim Diskominfo, verifikator, dan pimpinan dapat melihat. */
export default async function GapPage() {
  const actor = await currentActor();
  if (!can.viewGap(actor)) return <NoAccess />;
  const [rows, periods] = await Promise.all([listGaps(), periodOptions()]);
  return <GapDashboard data={pack(rows)} periods={periods} canManage={can.manageRencana(actor)} canExport={can.export(actor)} />;
}
