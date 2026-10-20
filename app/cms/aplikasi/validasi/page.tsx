import { AplikasiReviewQueue } from "@/components/cms/aplikasi/aplikasi-detail";
import { NoAccess } from "@/components/cms/no-access";
import { can, currentActor, stageStatus } from "@/lib/access";
import { listAplikasi } from "@/lib/aplikasi/cms-repo";

export default async function AplikasiValidasiPage() {
  const actor = await currentActor();
  if (!can.review(actor, "validasi", "aplikasi")) return <NoAccess title="Halaman ini untuk tim validasi" />;
  const rows = await listAplikasi({ statuses: [stageStatus.validasi] });
  return <AplikasiReviewQueue rows={rows} actor={actor} stage="validasi" />;
}
