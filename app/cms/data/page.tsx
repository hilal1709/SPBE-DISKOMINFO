import { DataList } from "@/components/cms/data/data-list";
import { can, currentActor } from "@/lib/access";
import { listData } from "@/lib/data/cms-repo";
import { periodOptions } from "@/lib/probis/periods";

export default async function DataListPage() {
  const actor = await currentActor();
  const [rows, periods] = await Promise.all([listData({ opdId: can.readAll(actor) ? null : (actor.opdId ?? "00000000-0000-0000-0000-000000000000") }), periodOptions()]);
  return <DataList rows={rows} actor={actor} periods={periods} />;
}
