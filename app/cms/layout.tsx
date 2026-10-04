import { CmsShell, type CmsUser } from "@/components/layout/cms-shell";
import { SampleBanner } from "@/components/cms/sample-banner";
import { RabProvider } from "@/components/probis/rab-context";
import { rabSetSafe } from "@/lib/probis/rab";
import { can, currentActor } from "@/lib/access";
import { cmsSummary, opdCodeOf } from "@/lib/probis/repo";
import { roleLabel } from "@/lib/roles";

export default async function CmsLayout({ children }: { children: React.ReactNode }) {
  const actor = await currentActor();
  const scope = can.readAll(actor) ? null : actor.opdId ?? "00000000-0000-0000-0000-000000000000";
  const [opdCode, summary, rabSet] = await Promise.all([
    actor.opdId ? opdCodeOf(actor.opdId).catch(() => null) : null,
    cmsSummary(scope).catch(() => null),
    rabSetSafe(),
  ]);
  const user: CmsUser = {
    name: actor.name,
    role: actor.role,
    roleLabel: actor.demo ? "Superadmin (demo)" : roleLabel[actor.role],
    opdName: opdCode,
    demo: actor.demo,
    badges: {
      submitted: can.verify(actor) ? summary?.counts.submitted : undefined,
      verified: can.validate(actor) ? summary?.counts.verified : undefined,
    },
  };

  return (
    <CmsShell user={user} notice={summary?.samples ? <SampleBanner count={summary.samples} canClear={can.managePeriods(actor)} /> : null}>
      <RabProvider set={rabSet}>{children}</RabProvider>
    </CmsShell>
  );
}
