import { KeamananImport } from "@/components/cms/keamanan/keamanan-import";
import { NoAccess } from "@/components/cms/no-access";
import { can, currentActor } from "@/lib/access";

export default async function KeamananImportPage() {
  const actor = await currentActor();
  if (!can.import(actor) && !can.export(actor)) return <NoAccess />;
  return <KeamananImport canImport={can.import(actor)} canExport={can.export(actor)} />;
}
