import { InfrastrukturList } from "@/components/cms/infrastruktur/infrastruktur-list";
import { currentActor, opdScope } from "@/lib/access";
import { listInfrastruktur } from "@/lib/infrastruktur/cms-repo";
import { periodOptions } from "@/lib/probis/periods";

export default async function InfrastrukturListPage() {
  const actor = await currentActor();
  const [rows, periods] = await Promise.all([listInfrastruktur({ opdId: opdScope(actor) }), periodOptions()]);
  return <InfrastrukturList rows={rows} actor={actor} periods={periods} />;
}
