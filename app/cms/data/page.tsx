import { DataList } from "@/components/cms/data/data-list";
import { currentActor, opdScope } from "@/lib/access";
import { listData } from "@/lib/data/cms-repo";
import { periodOptions } from "@/lib/probis/periods";

export default async function DataListPage() {
  const actor = await currentActor();
  const [rows, periods] = await Promise.all([listData({ opdId: opdScope(actor) }), periodOptions()]);
  return <DataList rows={rows} actor={actor} periods={periods} />;
}
