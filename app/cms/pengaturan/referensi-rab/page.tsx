import { RefPage } from "@/components/cms/ref-page";
import { rab } from "@/lib/probis/rab";

export default async function RabReferencePage({ searchParams }: { searchParams: Promise<{ versi?: string }> }) {
  return <RefPage kind="rab" repo={rab} versi={(await searchParams).versi} />;
}
