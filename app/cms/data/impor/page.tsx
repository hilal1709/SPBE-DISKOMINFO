import { DataImport } from "@/components/cms/data/data-import";
import { NoAccess } from "@/components/cms/no-access";
import { can, currentActor } from "@/lib/access";

export default async function DataImportPage() {
  const actor = await currentActor();
  if (!can.import(actor) && !can.export(actor)) return <NoAccess />;
  return <DataImport canImport={can.import(actor)} canExport={can.export(actor)} />;
}
