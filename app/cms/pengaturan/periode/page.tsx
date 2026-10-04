import { NoAccess } from "@/components/cms/no-access";
import { PeriodManager } from "@/components/cms/period-manager";
import { can, currentActor } from "@/lib/access";
import { MAX_SPAN, MIN_SPAN, listPeriods } from "@/lib/probis/periods";
import { listVersions } from "@/lib/probis/rab";

export default async function PeriodPage() {
  const actor = await currentActor();
  if (!can.managePeriods(actor)) return <NoAccess title="Halaman ini untuk tim Diskominfo" />;
  const [periods, versions] = await Promise.all([listPeriods(), listVersions()]);
  return <PeriodManager periods={periods} min={MIN_SPAN} max={MAX_SPAN} versions={versions.filter((v) => v.status === "published").map((v) => ({ id: v.id, name: v.name }))} />;
}
