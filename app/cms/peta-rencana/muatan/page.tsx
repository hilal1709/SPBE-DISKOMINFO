import { MuatanEditor } from "@/components/cms/peta-rencana/muatan-editor";
import { NoAccess } from "@/components/cms/no-access";
import { can, currentActor } from "@/lib/access";
import { listMuatan, muatanUsage } from "@/lib/peta-rencana/muatan-repo";

export default async function MuatanPage() {
  const actor = await currentActor();
  if (!can.manageRencana(actor)) return <NoAccess />;
  const [list, usage] = await Promise.all([listMuatan(), muatanUsage()]);
  return <MuatanEditor list={list} usage={usage} />;
}
