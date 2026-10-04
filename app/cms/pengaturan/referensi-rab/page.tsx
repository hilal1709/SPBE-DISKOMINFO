import { NoAccess } from "@/components/cms/no-access";
import { RabManager } from "@/components/cms/rab-manager";
import { can, currentActor } from "@/lib/access";
import { listVersions, versionChanges, versionNodes } from "@/lib/probis/rab";

export default async function RabReferencePage({ searchParams }: { searchParams: Promise<{ versi?: string }> }) {
  const actor = await currentActor();
  if (!can.manageReference(actor)) return <NoAccess title="Halaman ini untuk pengelola referensi arsitektur" />;
  const [{ versi }, versions] = await Promise.all([searchParams, listVersions()]);
  // Bawaan: draf terbaru bila ada, selain itu versi terbit terbaru.
  const current = versions.find((v) => v.id === versi) ?? [...versions].reverse().find((v) => v.status === "draft") ?? versions.at(-1)!;
  const [nodes, changes] = await Promise.all([versionNodes(current.id), versionChanges(current.id)]);
  return <RabManager key={current.id} versions={versions} current={current} nodes={nodes} changes={changes} />;
}
