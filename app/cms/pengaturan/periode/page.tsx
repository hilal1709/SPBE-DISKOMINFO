import { NoAccess } from "@/components/cms/no-access";
import { PeriodManager } from "@/components/cms/period-manager";
import { can, currentActor } from "@/lib/access";
import { ral } from "@/lib/layanan/ral";
import { MAX_SPAN, MIN_SPAN, listPeriods } from "@/lib/probis/periods";
import { rab } from "@/lib/probis/rab";
import type { VersionInfo } from "@/lib/reference/versioned";

const published = (list: VersionInfo[]) => list.filter((v) => v.status === "published").map((v) => ({ id: v.id, name: v.name }));

export default async function PeriodPage() {
  const actor = await currentActor();
  if (!can.managePeriods(actor)) return <NoAccess title="Halaman ini untuk tim Diskominfo" />;
  const [periods, rabVersions, ralVersions] = await Promise.all([listPeriods(), rab.listVersions(), ral.listVersions()]);
  return <PeriodManager periods={periods} min={MIN_SPAN} max={MAX_SPAN} versions={{ rab: published(rabVersions), ral: published(ralVersions) }} />;
}
