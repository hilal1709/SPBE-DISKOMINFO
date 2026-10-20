import { notFound } from "next/navigation";
import { InfrastrukturForm } from "@/components/cms/infrastruktur/infrastruktur-form";
import { NoAccess } from "@/components/cms/no-access";
import { can, currentActor } from "@/lib/access";
import { getInfrastruktur } from "@/lib/infrastruktur/cms-repo";
import { periodOptions } from "@/lib/probis/periods";
import { opdCodeOf } from "@/lib/probis/repo";

export default async function EditInfrastrukturPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [actor, record] = await Promise.all([currentActor(), getInfrastruktur(id)]);
  if (!record) notFound();
  if (!can.edit(actor, record)) return <NoAccess title="Komponen ini tidak dapat diubah" description="Hanya draf atau komponen yang dikembalikan yang bisa diubah oleh pemiliknya." />;
  const locked = can.lockedOpd(actor);
  return <InfrastrukturForm record={record} initialJenis={record.jenis} lockedOpd={locked ? await opdCodeOf(locked) : null} periods={await periodOptions()} />;
}
