import { DataForm } from "@/components/cms/data/data-form";
import { NoAccess } from "@/components/cms/no-access";
import { can } from "@/lib/access";
import { formContext, loadRecord } from "@/lib/cms/record-page";
import { getData } from "@/lib/data/cms-repo";

export default async function EditDataPage({ params }: { params: Promise<{ id: string }> }) {
  const { actor, record } = await loadRecord(params, getData);
  if (!can.edit(actor, record)) return <NoAccess title="Data ini tidak dapat diubah" description="Hanya draf atau data yang dikembalikan yang bisa diubah oleh pemiliknya." />;
  return <DataForm record={record} {...await formContext(actor)} />;
}
