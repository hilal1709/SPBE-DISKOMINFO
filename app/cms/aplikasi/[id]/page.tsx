import { AplikasiForm } from "@/components/cms/aplikasi/aplikasi-form";
import { NoAccess } from "@/components/cms/no-access";
import { can } from "@/lib/access";
import { formContext, loadRecord } from "@/lib/cms/record-page";
import { getAplikasi } from "@/lib/aplikasi/cms-repo";

export default async function EditAplikasiPage({ params }: { params: Promise<{ id: string }> }) {
  const { actor, record } = await loadRecord(params, getAplikasi);
  if (!can.edit(actor, record)) return <NoAccess title="Aplikasi ini tidak dapat diubah" description="Hanya draf atau aplikasi yang dikembalikan yang bisa diubah oleh pemiliknya." />;
  return <AplikasiForm record={record} {...await formContext(actor)} />;
}
