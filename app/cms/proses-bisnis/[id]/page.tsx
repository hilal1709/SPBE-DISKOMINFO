import { notFound } from "next/navigation";
import { ProbisForm } from "@/components/cms/probis-form";
import { NoAccess } from "@/components/cms/no-access";
import { can, currentActor } from "@/lib/access";
import { periodOptions } from "@/lib/probis/periods";
import { getProbis, opdCodeOf } from "@/lib/probis/repo";

export default async function EditProbisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [actor, record] = await Promise.all([currentActor(), getProbis(id)]);
  if (!record) notFound();
  if (!can.edit(actor, record)) return <NoAccess title="Probis ini tidak dapat diubah" description="Hanya draf atau probis yang dikembalikan yang bisa diubah oleh pemiliknya." />;
  const locked = can.lockedOpd(actor);
  return <ProbisForm record={record} lockedOpd={locked ? await opdCodeOf(locked) : null} periods={await periodOptions()} />;
}
