import { KeamananForm } from "@/components/cms/keamanan/keamanan-form";
import { NoAccess } from "@/components/cms/no-access";
import { can } from "@/lib/access";
import { formContext, loadRecord } from "@/lib/cms/record-page";
import { getKeamanan } from "@/lib/keamanan/cms-repo";

export default async function EditKeamananPage({ params }: { params: Promise<{ id: string }> }) {
  const { actor, record } = await loadRecord(params, getKeamanan);
  if (!can.edit(actor, record)) return <NoAccess title="Kegiatan ini tidak dapat diubah" description="Hanya draf atau kegiatan yang dikembalikan yang bisa diubah oleh pemiliknya." />;
  return <KeamananForm record={record} initialJenis={record.jenis} {...await formContext(actor)} />;
}
