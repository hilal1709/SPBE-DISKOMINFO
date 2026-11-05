"use client";
import Link from "next/link";
import { useEffect } from "react";
import { EmptyState } from "@/components/blocks/empty-state";
import { Button } from "@/components/ui/button";

/** Galat di dalam CMS tetap di dalam kerangka CMS (menu tidak hilang) dan bisa dicoba ulang. */
export default function CmsError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-[60svh] place-items-center p-6">
      <EmptyState
        illustration="error"
        size="lg"
        title="Halaman CMS gagal dimuat"
        description={<>Perubahan yang belum tersimpan mungkin perlu diulang.{error.digest && <span className="mt-2 block text-xs">Kode: {error.digest}</span>}</>}
      >
        <Button variant="outline" asChild><Link href="/cms">Ke beranda CMS</Link></Button>
        <Button onClick={() => retry()}>Coba lagi</Button>
      </EmptyState>
    </div>
  );
}
