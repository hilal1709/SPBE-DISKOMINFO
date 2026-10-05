import { RefPage } from "@/components/cms/ref-page";
import { rad } from "@/lib/data/rad";

export default async function RadReferencePage({ searchParams }: { searchParams: Promise<{ versi?: string }> }) {
  return <RefPage kind="rad" repo={rad} versi={(await searchParams).versi} />;
}
