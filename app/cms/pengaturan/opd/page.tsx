import { NoAccess } from "@/components/cms/no-access";
import { OpdManager } from "@/components/cms/opd-manager";
import { can, currentActor } from "@/lib/access";
import { listOpdPeriod } from "@/lib/opd/repo";
import { listPeriods } from "@/lib/probis/periods";

export default async function OpdPage({ searchParams }: { searchParams: Promise<{ periode?: string }> }) {
  const [actor, params] = await Promise.all([currentActor(), searchParams]);
  if (!can.managePeriods(actor)) return <NoAccess title="Halaman ini untuk tim Diskominfo" />;
  const periods = (await listPeriods()).map((p) => ({ id: p.id, name: p.name, active: p.active }));
  const period = periods.find((p) => p.name === params.periode) ?? periods.find((p) => p.active) ?? periods.at(-1);
  if (!period) return <NoAccess title="Belum ada periode arsitektur" />;
  return <OpdManager periods={periods} period={period} rows={await listOpdPeriod(period.id)} />;
}
