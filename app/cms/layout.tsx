import { Suspense } from "react";
import { CmsShell, type CmsUser } from "@/components/layout/cms-shell";
import { CmsShellSkeleton } from "@/components/layout/cms-shell-skeleton";
import { SampleBanner } from "@/components/cms/sample-banner";
import { RalProvider } from "@/components/layanan/ral-context";
import { RabProvider } from "@/components/probis/rab-context";
import { layananSummary } from "@/lib/layanan/cms-repo";
import { ralSetSafe } from "@/lib/layanan/ral";
import { rabSetSafe } from "@/lib/probis/rab";
import { can, currentActor } from "@/lib/access";
import { cmsSummary, opdCodeOf } from "@/lib/probis/repo";
import { roleLabel } from "@/lib/roles";

/** Kerangka CMS tampil seketika; sesi, ringkasan, dan referensi RAB/RAL dimuat di baliknya. */
export default function CmsLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<CmsShellSkeleton />}>
      <CmsFrame>{children}</CmsFrame>
    </Suspense>
  );
}

async function CmsFrame({ children }: { children: React.ReactNode }) {
  const actor = await currentActor();
  const scope = can.readAll(actor) ? null : actor.opdId ?? "00000000-0000-0000-0000-000000000000";
  const [opdCode, summary, layanan, rabSet, ralSet] = await Promise.all([
    actor.opdId ? opdCodeOf(actor.opdId).catch(() => null) : null,
    cmsSummary(scope).catch(() => null),
    layananSummary(scope).catch(() => null),
    rabSetSafe(),
    ralSetSafe(),
  ]);
  const samples = (summary?.samples ?? 0) + (layanan?.samples ?? 0);
  const user: CmsUser = {
    name: actor.name,
    role: actor.role,
    roleLabel: actor.demo ? "Superadmin (demo)" : roleLabel[actor.role],
    opdName: opdCode,
    demo: actor.demo,
    badges: {
      submitted: can.verify(actor) ? summary?.counts.submitted : undefined,
      verified: can.validate(actor) ? summary?.counts.verified : undefined,
      layananSubmitted: can.verify(actor) ? layanan?.counts.submitted : undefined,
      layananVerified: can.validate(actor) ? layanan?.counts.verified : undefined,
    },
  };

  return (
    <CmsShell user={user} notice={samples ? <SampleBanner count={samples} probis={summary?.samples ?? 0} layanan={layanan?.samples ?? 0} canClear={can.managePeriods(actor)} /> : null}>
      <RabProvider set={rabSet}>
        <RalProvider set={ralSet}>{children}</RalProvider>
      </RabProvider>
    </CmsShell>
  );
}
