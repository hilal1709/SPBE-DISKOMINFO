import { RencanaForm } from "@/components/cms/peta-rencana/rencana-form";
import { NoAccess } from "@/components/cms/no-access";
import { can, currentActor } from "@/lib/access";
import { periodOptions } from "@/lib/probis/periods";

export default async function NewRencanaPage() {
  const actor = await currentActor();
  if (!can.manageRencana(actor)) return <NoAccess />;
  return <RencanaForm record={null} periods={await periodOptions()} />;
}
