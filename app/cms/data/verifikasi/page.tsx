import { DataReviewQueue } from "@/components/cms/data/data-detail";
import { NoAccess } from "@/components/cms/no-access";
import { can, currentActor, stageStatus } from "@/lib/access";
import { listData } from "@/lib/data/cms-repo";

export default async function DataVerifikasiPage() {
  const actor = await currentActor();
  if (!can.review(actor, "verifikasi", "data")) return <NoAccess title="Halaman ini untuk Verifikator Data Diskominfo" />;
  const rows = await listData({ statuses: [stageStatus.verifikasi] });
  return <DataReviewQueue rows={rows} actor={actor} stage="verifikasi" />;
}
