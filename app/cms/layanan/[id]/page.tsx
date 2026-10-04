import { notFound } from "next/navigation";
import { LayananForm } from "@/components/cms/layanan/layanan-form";
import { NoAccess } from "@/components/cms/no-access";
import { can, currentActor } from "@/lib/access";
import { getLayanan } from "@/lib/layanan/cms-repo";
import { periodOptions } from "@/lib/probis/periods";
import { opdCodeOf } from "@/lib/probis/repo";

export default async function EditLayananPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [actor, record] = await Promise.all([currentActor(), getLayanan(id)]);
  if (!record) notFound();
  if (!can.edit(actor, record)) return <NoAccess title="Layanan ini tidak dapat diubah" description="Hanya draf atau layanan yang dikembalikan yang bisa diubah oleh pemiliknya." />;
  const locked = can.lockedOpd(actor);
  return <LayananForm record={record} lockedOpd={locked ? await opdCodeOf(locked) : null} periods={await periodOptions()} />;
}
