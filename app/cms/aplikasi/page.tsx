import { AplikasiList } from "@/components/cms/aplikasi/aplikasi-list";
import { can, currentActor } from "@/lib/access";
import { listAplikasi } from "@/lib/aplikasi/cms-repo";
import { periodOptions } from "@/lib/probis/periods";

export default async function AplikasiListPage() {
  const actor = await currentActor();
  const [rows, periods] = await Promise.all([listAplikasi({ opdId: can.readAll(actor) ? null : (actor.opdId ?? "00000000-0000-0000-0000-000000000000") }), periodOptions()]);
  return <AplikasiList rows={rows} actor={actor} periods={periods} />;
}
