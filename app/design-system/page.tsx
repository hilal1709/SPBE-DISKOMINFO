import type { Metadata } from "next";
import { DesignSystemShowcase } from "@/components/design-system/showcase";
import { noIndex } from "@/lib/seo";

export const metadata: Metadata = { title: "Design System", ...noIndex };

export default function Page() {
  return <DesignSystemShowcase />;
}
