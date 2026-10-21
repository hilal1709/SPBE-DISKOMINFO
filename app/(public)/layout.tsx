import { PublicShell } from "@/components/layout/public-shell";
import { JsonLd } from "@/components/seo/json-ld";
import { siteJsonLd } from "@/lib/seo";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={siteJsonLd()} />
      <PublicShell>{children}</PublicShell>
    </>
  );
}
