import { RefPage } from "@/components/cms/ref-page";
import { ral } from "@/lib/layanan/ral";

export default async function RalReferencePage({ searchParams }: { searchParams: Promise<{ versi?: string }> }) {
  return <RefPage kind="ral" repo={ral} versi={(await searchParams).versi} />;
}
