import { NoAccess } from "@/components/cms/no-access";
import { ReviewQueue } from "@/components/cms/review-queue";
import { can, currentActor, stageStatus } from "@/lib/access";
import { listProbis } from "@/lib/probis/repo";

export default async function VerifikasiPage() {
  const actor = await currentActor();
  if (!can.review(actor, "verifikasi")) return <NoAccess title="Halaman ini untuk tim verifikasi" />;
  const rows = await listProbis({ statuses: [stageStatus.verifikasi] });
  return <ReviewQueue rows={rows} actor={actor} stage="verifikasi" />;
}
