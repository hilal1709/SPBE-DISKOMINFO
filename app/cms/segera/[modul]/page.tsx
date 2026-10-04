import Link from "next/link";
import { EmptyState } from "@/components/blocks/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cmsNav, flattenNav } from "@/lib/navigation";

export default async function ComingSoonPage({ params }: { params: Promise<{ modul: string }> }) {
  const { modul } = await params;
  const item = flattenNav(cmsNav).find((n) => n.href === `/cms/segera/${modul}`);
  return (
    <Card>
      <EmptyState illustration="building" size="lg" title={`Modul ${item?.label ?? "ini"} sedang disiapkan`} description="Pengembangan dilakukan bertahap per domain. Modul Proses Bisnis sudah dapat digunakan.">
        <Button asChild>
          <Link href="/cms/proses-bisnis">Buka Proses Bisnis</Link>
        </Button>
      </EmptyState>
    </Card>
  );
}
