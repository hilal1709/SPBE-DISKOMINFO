import { LayananReviewQueue } from "@/components/cms/layanan/layanan-detail";
import { NoAccess } from "@/components/cms/no-access";
import { can, currentActor, stageStatus } from "@/lib/access";
import { listLayanan } from "@/lib/layanan/cms-repo";

export default async function LayananValidasiPage() {
  const actor = await currentActor();
  if (!can.review(actor, "validasi")) return <NoAccess title="Halaman ini untuk tim validasi" />;
  const rows = await listLayanan({ statuses: [stageStatus.validasi] });
  return <LayananReviewQueue rows={rows} actor={actor} stage="validasi" />;
}
