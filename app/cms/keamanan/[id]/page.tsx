import { notFound } from "next/navigation";
import { KeamananForm } from "@/components/cms/keamanan/keamanan-form";
import { NoAccess } from "@/components/cms/no-access";
import { can, currentActor } from "@/lib/access";
import { getKeamanan } from "@/lib/keamanan/cms-repo";
import { periodOptions } from "@/lib/probis/periods";
import { opdCodeOf } from "@/lib/probis/repo";

export default async function EditKeamananPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [actor, record] = await Promise.all([currentActor(), getKeamanan(id)]);
  if (!record) notFound();
  if (!can.edit(actor, record)) return <NoAccess title="Kegiatan ini tidak dapat diubah" description="Hanya draf atau kegiatan yang dikembalikan yang bisa diubah oleh pemiliknya." />;
  const locked = can.lockedOpd(actor);
  return <KeamananForm record={record} initialJenis={record.jenis} lockedOpd={locked ? await opdCodeOf(locked) : null} periods={await periodOptions()} />;
}
