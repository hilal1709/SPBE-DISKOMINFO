import { InfrastrukturImport } from "@/components/cms/infrastruktur/infrastruktur-import";
import { NoAccess } from "@/components/cms/no-access";
import { can, currentActor } from "@/lib/access";

export default async function InfrastrukturImportPage() {
  const actor = await currentActor();
  if (!can.import(actor) && !can.export(actor)) return <NoAccess />;
  return <InfrastrukturImport canImport={can.import(actor)} canExport={can.export(actor)} />;
}
