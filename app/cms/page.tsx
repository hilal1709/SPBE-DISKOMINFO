import { CmsHome } from "@/components/cms/cms-home";
import { can, currentActor } from "@/lib/access";
import { cmsSummary } from "@/lib/probis/repo";

export default async function CmsPage() {
  const actor = await currentActor();
  const scope = can.readAll(actor) ? null : actor.opdId ?? "00000000-0000-0000-0000-000000000000";
  const summary = await cmsSummary(scope);
  return <CmsHome actor={actor} counts={summary.counts} recent={summary.recent} review={summary.review} />;
}
