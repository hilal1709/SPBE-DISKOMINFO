import type { Metadata } from "next";
import { DesignSystemShowcase } from "@/components/design-system/showcase";
import { noIndex } from "@/lib/seo";

export const metadata: Metadata = { title: "Design System", ...noIndex };

/** Referensi internal pengembang; di production diblokir oleh proxy.ts. */
export default function Page() {
  return <DesignSystemShowcase />;
}
