import { notFound } from "next/navigation";
import { AplikasiForm } from "@/components/cms/aplikasi/aplikasi-form";
import { NoAccess } from "@/components/cms/no-access";
import { can, currentActor } from "@/lib/access";
import { getAplikasi } from "@/lib/aplikasi/cms-repo";
import { periodOptions } from "@/lib/probis/periods";
import { opdCodeOf } from "@/lib/probis/repo";

export default async function EditAplikasiPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [actor, record] = await Promise.all([currentActor(), getAplikasi(id)]);
  if (!record) notFound();
  if (!can.edit(actor, record)) return <NoAccess title="Aplikasi ini tidak dapat diubah" description="Hanya draf atau aplikasi yang dikembalikan yang bisa diubah oleh pemiliknya." />;
  const locked = can.lockedOpd(actor);
  return <AplikasiForm record={record} lockedOpd={locked ? await opdCodeOf(locked) : null} periods={await periodOptions()} />;
}
