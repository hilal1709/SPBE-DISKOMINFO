import { PublicShell } from "@/components/layout/public-shell";
import { JsonLd } from "@/components/seo/json-ld";
import { OpdScope } from "@/components/opd/opd-scope";
import { MuatanScope } from "@/components/peta-rencana/muatan-scope";
import { siteJsonLd } from "@/lib/seo";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={siteJsonLd()} />
      <PublicShell>
        <OpdScope><MuatanScope>{children}</MuatanScope></OpdScope>
      </PublicShell>
    </>
  );
}
