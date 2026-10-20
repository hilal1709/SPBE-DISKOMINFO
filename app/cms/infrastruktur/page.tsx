import { InfrastrukturList } from "@/components/cms/infrastruktur/infrastruktur-list";
import { can, currentActor } from "@/lib/access";
import { listInfrastruktur } from "@/lib/infrastruktur/cms-repo";
import { periodOptions } from "@/lib/probis/periods";

export default async function InfrastrukturListPage() {
  const actor = await currentActor();
  const [rows, periods] = await Promise.all([listInfrastruktur({ opdId: can.readAll(actor) ? null : (actor.opdId ?? "00000000-0000-0000-0000-000000000000") }), periodOptions()]);
  return <InfrastrukturList rows={rows} actor={actor} periods={periods} />;
}
