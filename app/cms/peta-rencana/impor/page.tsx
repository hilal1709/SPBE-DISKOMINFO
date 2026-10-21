import { RencanaImport } from "@/components/cms/peta-rencana/rencana-import";
import { NoAccess } from "@/components/cms/no-access";
import { can, currentActor } from "@/lib/access";

export default async function RencanaImportPage() {
  const actor = await currentActor();
  if (!can.manageRencana(actor)) return <NoAccess />;
  return <RencanaImport canImport canExport={can.export(actor)} />;
}
