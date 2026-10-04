import { NoAccess } from "@/components/cms/no-access";
import { RefManager } from "@/components/cms/ref-manager";
import { can, currentActor } from "@/lib/access";
import type { RefKind, VersionedRef } from "@/lib/reference/versioned";

/** Isi halaman Pengaturan › Referensi RAB/RAL (server). */
export async function RefPage({ kind, repo, versi }: { kind: RefKind; repo: VersionedRef; versi?: string }) {
  const actor = await currentActor();
  if (!can.manageReference(actor)) return <NoAccess title="Halaman ini untuk pengelola referensi arsitektur" />;
  const versions = await repo.listVersions();
  // Bawaan: draf terbaru bila ada, selain itu versi terbit terbaru.
  const current = versions.find((v) => v.id === versi) ?? [...versions].reverse().find((v) => v.status === "draft") ?? versions.at(-1);
  if (!current) return <NoAccess title={`Belum ada versi ${repo.label}`} description="Jalankan migrasi database terlebih dahulu." />;
  const [nodes, changes] = await Promise.all([repo.versionNodes(current.id), repo.versionChanges(current.id)]);
  return <RefManager key={current.id} kind={kind} versions={versions} current={current} nodes={nodes} changes={changes} />;
}
