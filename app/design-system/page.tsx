import type { Metadata } from "next";
import { DesignSystemShowcase } from "@/components/design-system/showcase";

export const metadata: Metadata = { title: "Design System · SPBE Gresik" };

export default function Page() {
  return <DesignSystemShowcase />;
}
