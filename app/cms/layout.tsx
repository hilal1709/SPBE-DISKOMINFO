import { Suspense } from "react";
import { CmsShell, type CmsUser } from "@/components/layout/cms-shell";
import { CmsShellSkeleton } from "@/components/layout/cms-shell-skeleton";
import { SampleBanner } from "@/components/cms/sample-banner";
import { RaaProvider } from "@/components/aplikasi/raa-context";
import { RaiProvider } from "@/components/infrastruktur/rai-context";
import { RadProvider } from "@/components/data/rad-context";
import { RalProvider } from "@/components/layanan/ral-context";
import { RabProvider } from "@/components/probis/rab-context";
import { aplikasiSummary } from "@/lib/aplikasi/cms-repo";
import { raaSetSafe } from "@/lib/aplikasi/raa";
import { infrastrukturSummary } from "@/lib/infrastruktur/cms-repo";
import { raiSetSafe } from "@/lib/infrastruktur/rai";
import { keamananSummary, securityRefsSafe } from "@/lib/keamanan/cms-repo";
import { SecurityProvider } from "@/components/keamanan/security-context";
import { dataSummary } from "@/lib/data/cms-repo";
import { radSetSafe } from "@/lib/data/rad";
import { layananSummary } from "@/lib/layanan/cms-repo";
import { gapSummary } from "@/lib/gap/cms-repo";
import { rencanaSummary } from "@/lib/peta-rencana/cms-repo";
import { ralSetSafe } from "@/lib/layanan/ral";
import { rabSetSafe } from "@/lib/probis/rab";
import { can, currentActor } from "@/lib/access";
import { cmsSummary, opdCodeOf } from "@/lib/probis/repo";

/** Kerangka CMS tampil seketika; sesi, ringkasan, dan referensi RAB/RAL/RAD/RAA/RAI dimuat di baliknya. */
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
  const [opdCode, summary, layanan, data, aplikasi, infrastruktur, keamanan, rencana, gaps, rabSet, ralSet, radSet, raaSet, raiSet, securityRefs] = await Promise.all([
    actor.opdId ? opdCodeOf(actor.opdId).catch(() => null) : null,
    cmsSummary(scope).catch(() => null),
    layananSummary(scope).catch(() => null),
    dataSummary(scope).catch(() => null),
    aplikasiSummary(scope).catch(() => null),
    infrastrukturSummary(scope).catch(() => null),
    keamananSummary(scope).catch(() => null),
    rencanaSummary().catch(() => null),
    gapSummary().catch(() => null),
    rabSetSafe(),
    ralSetSafe(),
    radSetSafe(),
    raaSetSafe(),
    raiSetSafe(),
    securityRefsSafe(),
  ]);
  const samples = (summary?.samples ?? 0) + (layanan?.samples ?? 0) + (data?.samples ?? 0) + (aplikasi?.samples ?? 0) + (infrastruktur?.samples ?? 0) + (keamanan?.samples ?? 0) + (rencana?.samples ?? 0) + (gaps?.samples ?? 0);
  const user: CmsUser = {
    name: actor.name,
    role: actor.role,
    perms: actor.perms,
    roleLabel: actor.roleName,
    opdName: opdCode,
    demo: actor.demo,
    badges: {
      submitted: can.verify(actor) ? summary?.counts.submitted : undefined,
      verified: can.validate(actor) ? summary?.counts.verified : undefined,
      layananSubmitted: can.verify(actor, "layanan") ? layanan?.counts.submitted : undefined,
      layananVerified: can.validate(actor) ? layanan?.counts.verified : undefined,
      dataSubmitted: can.verify(actor, "data") ? data?.counts.submitted : undefined,
      dataVerified: can.validate(actor) ? data?.counts.verified : undefined,
      aplikasiSubmitted: can.verify(actor, "aplikasi") ? aplikasi?.counts.submitted : undefined,
      aplikasiVerified: can.validate(actor) ? aplikasi?.counts.verified : undefined,
      infrastrukturSubmitted: can.verify(actor, "infrastruktur") ? infrastruktur?.counts.submitted : undefined,
      infrastrukturVerified: can.validate(actor) ? infrastruktur?.counts.verified : undefined,
      keamananSubmitted: can.verify(actor, "keamanan") ? keamanan?.counts.submitted : undefined,
      keamananVerified: can.validate(actor) ? keamanan?.counts.verified : undefined,
    },
  };

  return (
    <CmsShell user={user} notice={samples ? <SampleBanner count={samples} probis={summary?.samples ?? 0} layanan={layanan?.samples ?? 0} data={data?.samples ?? 0} aplikasi={aplikasi?.samples ?? 0} infrastruktur={infrastruktur?.samples ?? 0} keamanan={keamanan?.samples ?? 0} rencana={rencana?.samples ?? 0} gap={gaps?.samples ?? 0} canClear={can.managePeriods(actor)} /> : null}>
      <RabProvider set={rabSet}>
        <RalProvider set={ralSet}>
          <RadProvider set={radSet}>
            <RaaProvider set={raaSet}>
              <RaiProvider set={raiSet}>
                <SecurityProvider refs={securityRefs}>{children}</SecurityProvider>
              </RaiProvider>
            </RaaProvider>
          </RadProvider>
        </RalProvider>
      </RabProvider>
    </CmsShell>
  );
}
