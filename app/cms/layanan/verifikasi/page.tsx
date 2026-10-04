import { LayananReviewQueue } from "@/components/cms/layanan/layanan-detail";
import { NoAccess } from "@/components/cms/no-access";
import { can, currentActor, stageStatus } from "@/lib/access";
import { listLayanan } from "@/lib/layanan/cms-repo";

export default async function LayananVerifikasiPage() {
  const actor = await currentActor();
  if (!can.review(actor, "verifikasi")) return <NoAccess title="Halaman ini untuk tim verifikasi" />;
  const rows = await listLayanan({ statuses: [stageStatus.verifikasi] });
  return <LayananReviewQueue rows={rows} actor={actor} stage="verifikasi" />;
}
