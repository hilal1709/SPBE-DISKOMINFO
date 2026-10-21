import { CmsHome } from "@/components/cms/cms-home";
import { can, currentActor, opdScope } from "@/lib/access";
import { aplikasiSummary } from "@/lib/aplikasi/cms-repo";
import { dataSummary } from "@/lib/data/cms-repo";
import { infrastrukturSummary } from "@/lib/infrastruktur/cms-repo";
import { keamananSummary } from "@/lib/keamanan/cms-repo";
import { layananSummary } from "@/lib/layanan/cms-repo";
import { gapSummary } from "@/lib/gap/cms-repo";
import { rencanaSummary } from "@/lib/peta-rencana/cms-repo";
import { cmsSummary } from "@/lib/probis/repo";

export default async function CmsPage() {
  const actor = await currentActor();
  const scope = opdScope(actor);
  const [probis, layanan, data, aplikasi, infrastruktur, keamanan, rencana, gaps] = await Promise.all([
    cmsSummary(scope),
    layananSummary(scope),
    dataSummary(scope),
    aplikasiSummary(scope),
    infrastrukturSummary(scope),
    keamananSummary(scope),
    can.manageRencana(actor) ? rencanaSummary().catch(() => null) : null,
    can.manageRencana(actor) ? gapSummary().catch(() => null) : null,
  ]);
  // Aktivitas terbaru gabungan semua domain.
  const recent = [
    ...probis.recent.map((a) => ({ ...a, kind: "probis" as const })),
    ...layanan.recent.map((a) => ({ ...a, kind: "layanan" as const })),
    ...data.recent.map((a) => ({ ...a, kind: "data" as const })),
    ...aplikasi.recent.map((a) => ({ ...a, kind: "aplikasi" as const })),
    ...infrastruktur.recent.map((a) => ({ ...a, kind: "infrastruktur" as const })),
    ...keamanan.recent.map((a) => ({ ...a, kind: "keamanan" as const })),
  ]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8);
  return <CmsHome actor={actor} probis={probis} layanan={layanan} data={data} aplikasi={aplikasi} infrastruktur={infrastruktur} keamanan={keamanan} rencana={rencana ? { ...rencana, openHighGaps: gaps?.openHigh ?? 0 } : null} recent={recent} />;
}
