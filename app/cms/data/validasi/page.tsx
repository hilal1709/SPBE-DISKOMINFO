import { DataReviewQueue } from "@/components/cms/data/data-detail";
import { NoAccess } from "@/components/cms/no-access";
import { can, currentActor, stageStatus } from "@/lib/access";
import { listData } from "@/lib/data/cms-repo";

export default async function DataValidasiPage() {
  const actor = await currentActor();
  if (!can.review(actor, "validasi", "data")) return <NoAccess title="Halaman ini untuk tim validasi" />;
  const rows = await listData({ statuses: [stageStatus.validasi] });
  return <DataReviewQueue rows={rows} actor={actor} stage="validasi" />;
}
