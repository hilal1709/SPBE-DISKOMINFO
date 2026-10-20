import { InfrastrukturReviewQueue } from "@/components/cms/infrastruktur/infrastruktur-detail";
import { NoAccess } from "@/components/cms/no-access";
import { can, currentActor, stageStatus } from "@/lib/access";
import { listInfrastruktur } from "@/lib/infrastruktur/cms-repo";

export default async function InfrastrukturVerifikasiPage() {
  const actor = await currentActor();
  if (!can.review(actor, "verifikasi", "infrastruktur")) return <NoAccess title="Halaman ini untuk Verifikator Infrastruktur Diskominfo" />;
  const rows = await listInfrastruktur({ statuses: [stageStatus.verifikasi] });
  return <InfrastrukturReviewQueue rows={rows} actor={actor} stage="verifikasi" />;
}
