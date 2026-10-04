import { NoAccess } from "@/components/cms/no-access";
import { ProbisImport } from "@/components/cms/probis-import";
import { can, currentActor } from "@/lib/access";

export default async function ImportPage() {
  const actor = await currentActor();
  if (!can.import(actor) && !can.export(actor)) return <NoAccess />;
  return <ProbisImport canImport={can.import(actor)} canExport={can.export(actor)} />;
}
