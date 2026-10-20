import { RefPage } from "@/components/cms/ref-page";
import { rai } from "@/lib/infrastruktur/rai";

export default async function RaiReferencePage({ searchParams }: { searchParams: Promise<{ versi?: string }> }) {
  return <RefPage kind="rai" repo={rai} versi={(await searchParams).versi} />;
}
