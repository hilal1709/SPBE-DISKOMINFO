import { ReferenceProviders } from "@/components/cms/reference-providers";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <ReferenceProviders need={["rad", "security"]}>{children}</ReferenceProviders>;
}
