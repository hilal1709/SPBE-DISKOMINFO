import { ProbisTable } from "@/components/cms/probis-table";
import { can, currentActor } from "@/lib/access";
import { periodOptions } from "@/lib/probis/periods";
import { listProbis } from "@/lib/probis/repo";

export default async function ProbisListPage() {
  const actor = await currentActor();
  const [rows, periods] = await Promise.all([
    listProbis({ opdId: can.readAll(actor) ? null : actor.opdId ?? "00000000-0000-0000-0000-000000000000" }),
    periodOptions(),
  ]);
  return <ProbisTable rows={rows} actor={actor} periods={periods} />;
}
