import { ExistingRecordSearch } from "@/components/cms/existing-record-search";
import { KeamananForm } from "@/components/cms/keamanan/keamanan-form";
import { NoAccess } from "@/components/cms/no-access";
import { can, currentActor } from "@/lib/access";
import { kegiatanKeys, type Kegiatan } from "@/lib/keamanan/jenis";
import { periodOptions } from "@/lib/probis/periods";
import { opdCodeOf } from "@/lib/probis/repo";

export default async function NewKeamananPage({ searchParams }: { searchParams: Promise<{ kegiatan?: string }> }) {
  const actor = await currentActor();
  if (!can.create(actor)) return <NoAccess />;
  const locked = can.lockedOpd(actor);
  const { kegiatan } = await searchParams;
  const jenis = (kegiatanKeys as readonly string[]).includes(kegiatan ?? "") ? (kegiatan as Kegiatan) : null;
  return <><ExistingRecordSearch domain="keamanan" /><KeamananForm record={null} initialJenis={jenis} lockedOpd={locked ? await opdCodeOf(locked) : null} periods={await periodOptions()} /></>;
}
