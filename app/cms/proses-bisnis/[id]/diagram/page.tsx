import { DiagramWorkspace } from "@/components/cms/bpmn/diagram-workspace";
import { can } from "@/lib/access";
import { loadRecord } from "@/lib/cms/record-page";
import { getProbis, getProbisDiagram } from "@/lib/probis/repo";

/** Editor diagram BPMN probis; peninjau dan rekaman yang terkunci mendapat viewer hanya-baca. */
export default async function ProbisDiagramPage({ params }: { params: Promise<{ id: string }> }) {
  const { actor, record } = await loadRecord(params, getProbis);
  const diagram = await getProbisDiagram(record.id);
  return <DiagramWorkspace id={record.id} code={record.code} name={record.name} status={record.status} xml={diagram.xml} editable={can.edit(actor, record)} />;
}
