import { RefPage } from "@/components/cms/ref-page";
import { raa } from "@/lib/aplikasi/raa";

export default async function RaaReferencePage({ searchParams }: { searchParams: Promise<{ versi?: string }> }) {
  return <RefPage kind="raa" repo={raa} versi={(await searchParams).versi} />;
}
