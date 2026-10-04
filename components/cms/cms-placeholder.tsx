import Link from "next/link";
import { EmptyState } from "@/components/blocks/empty-state";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/** Halaman modul CMS yang belum memiliki data operasional. */
export function CmsPlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <Reveal className="grid gap-6">
      <Card data-reveal className="py-10">
        <EmptyState
          illustration="building"
          size="lg"
          title={`Modul ${title} sedang disiapkan`}
          description={description}
        >
          <Button asChild variant="outline"><Link href="/cms">Kembali ke beranda</Link></Button>
          <Button asChild><Link href="/cms/layanan/baru">Tambah layanan</Link></Button>
        </EmptyState>
      </Card>
    </Reveal>
  );
}
