import { LayananForm } from "@/components/cms/layanan/layanan-form";
import { NoAccess } from "@/components/cms/no-access";
import { can } from "@/lib/access";
import { formContext, loadRecord } from "@/lib/cms/record-page";
import { getLayanan } from "@/lib/layanan/cms-repo";

export default async function EditLayananPage({ params }: { params: Promise<{ id: string }> }) {
  const { actor, record } = await loadRecord(params, getLayanan);
  if (!can.edit(actor, record)) return <NoAccess title="Layanan ini tidak dapat diubah" description="Hanya draf atau layanan yang dikembalikan yang bisa diubah oleh pemiliknya." />;
  return <LayananForm record={record} {...await formContext(actor)} />;
}
