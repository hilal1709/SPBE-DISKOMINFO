import { ReferenceProviders } from "@/components/cms/reference-providers";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <ReferenceProviders need={["rab", "ral"]}>{children}</ReferenceProviders>;
}
