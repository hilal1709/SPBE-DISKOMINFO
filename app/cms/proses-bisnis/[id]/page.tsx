import { ProbisForm } from "@/components/cms/probis-form";
import { NoAccess } from "@/components/cms/no-access";
import { can } from "@/lib/access";
import { formContext, loadRecord } from "@/lib/cms/record-page";
import { getProbis } from "@/lib/probis/repo";

export default async function EditProbisPage({ params }: { params: Promise<{ id: string }> }) {
  const { actor, record } = await loadRecord(params, getProbis);
  if (!can.edit(actor, record)) return <NoAccess title="Probis ini tidak dapat diubah" description="Hanya draf atau probis yang dikembalikan yang bisa diubah oleh pemiliknya." />;
  return <ProbisForm record={record} {...await formContext(actor)} />;
}
