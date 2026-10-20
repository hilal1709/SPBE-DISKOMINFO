import { KeamananList } from "@/components/cms/keamanan/keamanan-list";
import { can, currentActor } from "@/lib/access";
import { listKeamanan } from "@/lib/keamanan/cms-repo";
import { periodOptions } from "@/lib/probis/periods";

export default async function KeamananListPage() {
  const actor = await currentActor();
  const [rows, periods] = await Promise.all([listKeamanan({ opdId: can.readAll(actor) ? null : (actor.opdId ?? "00000000-0000-0000-0000-000000000000") }), periodOptions()]);
  return <KeamananList rows={rows} actor={actor} periods={periods} />;
}
