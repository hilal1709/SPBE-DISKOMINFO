import { CmsHome } from "@/components/cms/cms-home";
import { can, currentActor } from "@/lib/access";
import { dataSummary } from "@/lib/data/cms-repo";
import { layananSummary } from "@/lib/layanan/cms-repo";
import { cmsSummary } from "@/lib/probis/repo";

export default async function CmsPage() {
  const actor = await currentActor();
  const scope = can.readAll(actor) ? null : (actor.opdId ?? "00000000-0000-0000-0000-000000000000");
  const [probis, layanan, data] = await Promise.all([cmsSummary(scope), layananSummary(scope), dataSummary(scope)]);
  // Aktivitas terbaru gabungan probis + layanan + data.
  const recent = [
    ...probis.recent.map((a) => ({ ...a, kind: "probis" as const })),
    ...layanan.recent.map((a) => ({ ...a, kind: "layanan" as const })),
    ...data.recent.map((a) => ({ ...a, kind: "data" as const })),
  ]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8);
  return <CmsHome actor={actor} probis={probis} layanan={layanan} data={data} recent={recent} />;
}
