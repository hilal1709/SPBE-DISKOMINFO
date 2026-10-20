import { InfrastrukturReviewQueue } from "@/components/cms/infrastruktur/infrastruktur-detail";
import { NoAccess } from "@/components/cms/no-access";
import { can, currentActor, stageStatus } from "@/lib/access";
import { listInfrastruktur } from "@/lib/infrastruktur/cms-repo";

export default async function InfrastrukturValidasiPage() {
  const actor = await currentActor();
  if (!can.review(actor, "validasi", "infrastruktur")) return <NoAccess title="Halaman ini untuk tim validasi" />;
  const rows = await listInfrastruktur({ statuses: [stageStatus.validasi] });
  return <InfrastrukturReviewQueue rows={rows} actor={actor} stage="validasi" />;
}
