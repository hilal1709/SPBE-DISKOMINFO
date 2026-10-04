import { NoAccess } from "@/components/cms/no-access";
import { ReviewQueue } from "@/components/cms/review-queue";
import { can, currentActor, stageStatus } from "@/lib/access";
import { listProbis } from "@/lib/probis/repo";

export default async function ValidasiPage() {
  const actor = await currentActor();
  if (!can.review(actor, "validasi")) return <NoAccess title="Halaman ini untuk tim validasi" />;
  const rows = await listProbis({ statuses: [stageStatus.validasi] });
  return <ReviewQueue rows={rows} actor={actor} stage="validasi" />;
}
