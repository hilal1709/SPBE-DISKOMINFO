import Link from "next/link";
import { EmptyState } from "@/components/blocks/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/** Halaman yang tidak boleh diakses peran ini. */
export function NoAccess({ title = "Halaman ini bukan untuk peran Anda", description = "Hubungi admin Diskominfo bila Anda memerlukan akses." }: { title?: string; description?: string }) {
  return (
    <Card>
      <EmptyState illustration="error" title={title} description={description}>
        <Button asChild variant="outline">
          <Link href="/cms">Kembali ke beranda</Link>
        </Button>
      </EmptyState>
    </Card>
  );
}
