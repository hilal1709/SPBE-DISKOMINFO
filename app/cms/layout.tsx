import type { Metadata } from "next";
import { Suspense } from "react";
import { CmsShell, type CmsUser } from "@/components/layout/cms-shell";
import { CmsShellSkeleton } from "@/components/layout/cms-shell-skeleton";
import { SampleBanner } from "@/components/cms/sample-banner";
import { can, currentActor, opdScope } from "@/lib/access";
import { cmsBadges } from "@/lib/cms/badges";
import { opdCodeOf } from "@/lib/probis/repo";
import { noIndex } from "@/lib/seo";

export const metadata: Metadata = { title: "CMS", ...noIndex };

/** Kerangka CMS tampil seketika; sesi dan lencana menu dimuat di baliknya. Referensi dipasang di layout tiap domain. */
export default function CmsLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<CmsShellSkeleton />}>
      <CmsFrame>{children}</CmsFrame>
    </Suspense>
  );
}

async function CmsFrame({ children }: { children: React.ReactNode }) {
  const actor = await currentActor();
  const scope = opdScope(actor);
  const [opdCode, badges] = await Promise.all([actor.opdId ? opdCodeOf(actor.opdId).catch(() => null) : null, cmsBadges(scope).catch(() => null)]);
  const n = (domain: keyof NonNullable<typeof badges>) => badges?.[domain] ?? { submitted: undefined, verified: undefined, samples: 0 };
  const [probis, layanan, data, aplikasi, infrastruktur, keamanan, rencana, gaps] = (["probis", "layanan", "data", "aplikasi", "infrastruktur", "keamanan", "rencana", "gap"] as const).map(n);
  const samples = probis.samples + layanan.samples + data.samples + aplikasi.samples + infrastruktur.samples + keamanan.samples + rencana.samples + gaps.samples;
  const user: CmsUser = {
    name: actor.name,
    role: actor.role,
    perms: actor.perms,
    roleLabel: actor.roleName,
    opdName: opdCode,
    demo: actor.demo,
    badges: {
      submitted: can.verify(actor) ? probis.submitted : undefined,
      verified: can.validate(actor) ? probis.verified : undefined,
      layananSubmitted: can.verify(actor, "layanan") ? layanan.submitted : undefined,
      layananVerified: can.validate(actor) ? layanan.verified : undefined,
      dataSubmitted: can.verify(actor, "data") ? data.submitted : undefined,
      dataVerified: can.validate(actor) ? data.verified : undefined,
      aplikasiSubmitted: can.verify(actor, "aplikasi") ? aplikasi.submitted : undefined,
      aplikasiVerified: can.validate(actor) ? aplikasi.verified : undefined,
      infrastrukturSubmitted: can.verify(actor, "infrastruktur") ? infrastruktur.submitted : undefined,
      infrastrukturVerified: can.validate(actor) ? infrastruktur.verified : undefined,
      keamananSubmitted: can.verify(actor, "keamanan") ? keamanan.submitted : undefined,
      keamananVerified: can.validate(actor) ? keamanan.verified : undefined,
    },
  };

  return (
    <CmsShell user={user} notice={samples ? <SampleBanner count={samples} probis={probis.samples} layanan={layanan.samples} data={data.samples} aplikasi={aplikasi.samples} infrastruktur={infrastruktur.samples} keamanan={keamanan.samples} rencana={rencana.samples} gap={gaps.samples} canClear={can.managePeriods(actor)} /> : null}>
      {children}
    </CmsShell>
  );
}
