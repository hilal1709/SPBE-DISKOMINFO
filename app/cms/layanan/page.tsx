import { LayananTable } from "@/components/cms/layanan/layanan-table";
import { currentActor, opdScope } from "@/lib/access";
import { listLayanan } from "@/lib/layanan/cms-repo";
import { periodOptions } from "@/lib/probis/periods";

export default async function LayananListPage() {
  const actor = await currentActor();
  const [rows, periods] = await Promise.all([listLayanan({ opdId: opdScope(actor) }), periodOptions()]);
  return <LayananTable rows={rows} actor={actor} periods={periods} />;
}
