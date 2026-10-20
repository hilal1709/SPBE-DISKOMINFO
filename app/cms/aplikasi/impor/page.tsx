import { AplikasiImport } from "@/components/cms/aplikasi/aplikasi-import";
import { NoAccess } from "@/components/cms/no-access";
import { can, currentActor } from "@/lib/access";

export default async function AplikasiImportPage() {
  const actor = await currentActor();
  if (!can.import(actor) && !can.export(actor)) return <NoAccess />;
  return <AplikasiImport canImport={can.import(actor)} canExport={can.export(actor)} />;
}
