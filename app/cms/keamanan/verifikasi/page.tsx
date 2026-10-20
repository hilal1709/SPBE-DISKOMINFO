import { KeamananReviewQueue } from "@/components/cms/keamanan/keamanan-detail";
import { NoAccess } from "@/components/cms/no-access";
import { can, currentActor, stageStatus } from "@/lib/access";
import { listKeamanan } from "@/lib/keamanan/cms-repo";

export default async function KeamananVerifikasiPage() {
  const actor = await currentActor();
  if (!can.review(actor, "verifikasi", "keamanan")) return <NoAccess title="Halaman ini untuk Verifikator Keamanan Diskominfo" />;
  const rows = await listKeamanan({ statuses: [stageStatus.verifikasi] });
  return <KeamananReviewQueue rows={rows} actor={actor} stage="verifikasi" />;
}
