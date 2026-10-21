import type { Metadata } from "next";
import { ServiceCatalog } from "@/components/portal/sections";
import { noIndex } from "@/lib/seo";

// Katalog masih memakai data contoh dan tidak ada di menu: jangan diindeks.
export const metadata: Metadata = { title: "Katalog Layanan", ...noIndex };

export default function Page() {
  return <ServiceCatalog />;
}
