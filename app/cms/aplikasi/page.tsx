import { AplikasiList } from "@/components/cms/aplikasi/aplikasi-list";
import { currentActor, opdScope } from "@/lib/access";
import { listAplikasi } from "@/lib/aplikasi/cms-repo";
import { periodOptions } from "@/lib/probis/periods";

export default async function AplikasiListPage() {
  const actor = await currentActor();
  const [rows, periods] = await Promise.all([listAplikasi({ opdId: opdScope(actor) }), periodOptions()]);
  return <AplikasiList rows={rows} actor={actor} periods={periods} />;
}
