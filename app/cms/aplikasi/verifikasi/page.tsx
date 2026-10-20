import { AplikasiReviewQueue } from "@/components/cms/aplikasi/aplikasi-detail";
import { NoAccess } from "@/components/cms/no-access";
import { can, currentActor, stageStatus } from "@/lib/access";
import { listAplikasi } from "@/lib/aplikasi/cms-repo";

export default async function AplikasiVerifikasiPage() {
  const actor = await currentActor();
  if (!can.review(actor, "verifikasi", "aplikasi")) return <NoAccess title="Halaman ini untuk Verifikator Aplikasi Diskominfo" />;
  const rows = await listAplikasi({ statuses: [stageStatus.verifikasi] });
  return <AplikasiReviewQueue rows={rows} actor={actor} stage="verifikasi" />;
}
