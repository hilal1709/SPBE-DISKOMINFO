import { notFound } from "next/navigation";
import { DataForm } from "@/components/cms/data/data-form";
import { NoAccess } from "@/components/cms/no-access";
import { can, currentActor } from "@/lib/access";
import { getData } from "@/lib/data/cms-repo";
import { periodOptions } from "@/lib/probis/periods";
import { opdCodeOf } from "@/lib/probis/repo";

export default async function EditDataPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [actor, record] = await Promise.all([currentActor(), getData(id)]);
  if (!record) notFound();
  if (!can.edit(actor, record)) return <NoAccess title="Data ini tidak dapat diubah" description="Hanya draf atau data yang dikembalikan yang bisa diubah oleh pemiliknya." />;
  const locked = can.lockedOpd(actor);
  return <DataForm record={record} lockedOpd={locked ? await opdCodeOf(locked) : null} periods={await periodOptions()} />;
}
