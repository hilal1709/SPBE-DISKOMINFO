import { GapDashboard } from "@/components/cms/gap/gap-dashboard";
import { NoAccess } from "@/components/cms/no-access";
import { can, currentActor, opdScope } from "@/lib/access";
import { chainCoverage } from "@/lib/gap/chain";
import { pack } from "@/lib/pack";
import { periodOptions } from "@/lib/probis/periods";

/** Gap Analysis: kelengkapan layanan, data, aplikasi, infrastruktur, dan keamanan tiap proses bisnis tervalidasi. */
export default async function GapPage() {
  const actor = await currentActor();
  if (!can.viewGap(actor)) return <NoAccess />;
  const periods = await periodOptions();
  const rows = await chainCoverage(periods.active, opdScope(actor));
  return <GapDashboard initial={{ period: periods.active, data: pack(rows) }} periods={periods} canExport={can.export(actor)} />;
}
