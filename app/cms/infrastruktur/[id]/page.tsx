import { InfrastrukturForm } from "@/components/cms/infrastruktur/infrastruktur-form";
import { NoAccess } from "@/components/cms/no-access";
import { can } from "@/lib/access";
import { formContext, loadRecord } from "@/lib/cms/record-page";
import { getInfrastruktur } from "@/lib/infrastruktur/cms-repo";

export default async function EditInfrastrukturPage({ params }: { params: Promise<{ id: string }> }) {
  const { actor, record } = await loadRecord(params, getInfrastruktur);
  if (!can.edit(actor, record)) return <NoAccess title="Komponen ini tidak dapat diubah" description="Hanya draf atau komponen yang dikembalikan yang bisa diubah oleh pemiliknya." />;
  return <InfrastrukturForm record={record} initialJenis={record.jenis} {...await formContext(actor)} />;
}
