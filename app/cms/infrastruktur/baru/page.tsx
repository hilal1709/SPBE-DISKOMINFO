import { ExistingRecordSearch } from "@/components/cms/existing-record-search";
import { InfrastrukturForm } from "@/components/cms/infrastruktur/infrastruktur-form";
import { NoAccess } from "@/components/cms/no-access";
import { can, currentActor } from "@/lib/access";
import { jenisKeys, type InfraJenis } from "@/lib/infrastruktur/jenis";
import { periodOptions } from "@/lib/probis/periods";
import { opdCodeOf } from "@/lib/probis/repo";

export default async function NewInfrastrukturPage({ searchParams }: { searchParams: Promise<{ komponen?: string }> }) {
  const actor = await currentActor();
  if (!can.create(actor)) return <NoAccess />;
  const locked = can.lockedOpd(actor);
  const { komponen } = await searchParams;
  const jenis = (jenisKeys as readonly string[]).includes(komponen ?? "") ? (komponen as InfraJenis) : null;
  return <><ExistingRecordSearch domain="infrastruktur" /><InfrastrukturForm record={null} initialJenis={jenis} lockedOpd={locked ? await opdCodeOf(locked) : null} periods={await periodOptions()} /></>;
}
