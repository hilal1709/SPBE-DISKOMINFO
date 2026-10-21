import { notFound } from "next/navigation";
import { RencanaForm } from "@/components/cms/peta-rencana/rencana-form";
import { NoAccess } from "@/components/cms/no-access";
import { can, currentActor } from "@/lib/access";
import { getRencana } from "@/lib/peta-rencana/cms-repo";
import { periodOptions } from "@/lib/probis/periods";

export default async function EditRencanaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [actor, record] = await Promise.all([currentActor(), getRencana(id)]);
  if (!record) notFound();
  if (!can.manageRencana(actor)) return <NoAccess />;
  return <RencanaForm record={record} periods={await periodOptions()} />;
}
