import { LayananTable } from "@/components/cms/layanan/layanan-table";
import { can, currentActor } from "@/lib/access";
import { listLayanan } from "@/lib/layanan/cms-repo";
import { periodOptions } from "@/lib/probis/periods";

export default async function LayananListPage() {
  const actor = await currentActor();
  const [rows, periods] = await Promise.all([listLayanan({ opdId: can.readAll(actor) ? null : (actor.opdId ?? "00000000-0000-0000-0000-000000000000") }), periodOptions()]);
  return <LayananTable rows={rows} actor={actor} periods={periods} />;
}
