import { ProbisForm } from "@/components/cms/probis-form";
import { NoAccess } from "@/components/cms/no-access";
import { can, currentActor } from "@/lib/access";
import { periodOptions } from "@/lib/probis/periods";
import { opdCodeOf } from "@/lib/probis/repo";

export default async function NewProbisPage() {
  const actor = await currentActor();
  if (!can.create(actor)) return <NoAccess />;
  const locked = can.lockedOpd(actor);
  return <ProbisForm record={null} lockedOpd={locked ? await opdCodeOf(locked) : null} periods={await periodOptions()} />;
}
