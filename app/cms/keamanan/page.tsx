import { KeamananList } from "@/components/cms/keamanan/keamanan-list";
import { currentActor, opdScope } from "@/lib/access";
import { listKeamanan } from "@/lib/keamanan/cms-repo";
import { periodOptions } from "@/lib/probis/periods";

export default async function KeamananListPage() {
  const actor = await currentActor();
  const [rows, periods] = await Promise.all([listKeamanan({ opdId: opdScope(actor) }), periodOptions()]);
  return <KeamananList rows={rows} actor={actor} periods={periods} />;
}
