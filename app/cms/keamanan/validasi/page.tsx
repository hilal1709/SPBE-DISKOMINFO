import { KeamananReviewQueue } from "@/components/cms/keamanan/keamanan-detail";
import { NoAccess } from "@/components/cms/no-access";
import { can, currentActor, stageStatus } from "@/lib/access";
import { listKeamanan } from "@/lib/keamanan/cms-repo";

export default async function KeamananValidasiPage() {
  const actor = await currentActor();
  if (!can.review(actor, "validasi", "keamanan")) return <NoAccess title="Halaman ini untuk tim validasi" />;
  const rows = await listKeamanan({ statuses: [stageStatus.validasi] });
  return <KeamananReviewQueue rows={rows} actor={actor} stage="validasi" />;
}
