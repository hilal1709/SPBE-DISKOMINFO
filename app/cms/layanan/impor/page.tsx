import { LayananImport } from "@/components/cms/layanan/layanan-import";
import { NoAccess } from "@/components/cms/no-access";
import { can, currentActor } from "@/lib/access";

export default async function LayananImportPage() {
  const actor = await currentActor();
  if (!can.import(actor) && !can.export(actor)) return <NoAccess />;
  return <LayananImport canImport={can.import(actor)} canExport={can.export(actor)} />;
}
