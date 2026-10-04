"use client";
import Link from "next/link";
import { useEffect } from "react";
import { EmptyState } from "@/components/blocks/empty-state";
import { Button } from "@/components/ui/button";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="grid min-h-[70svh] place-items-center p-6">
      <EmptyState
        illustration="error"
        size="lg"
        title="Terjadi gangguan"
        description={<>Kami gagal memuat halaman ini. Coba lagi sebentar lagi.{error.digest && <span className="mt-2 block text-xs">Kode: {error.digest}</span>}</>}
      >
        <Button variant="outline" asChild><Link href="/">Ke beranda</Link></Button>
        <Button onClick={() => retry()}>Coba lagi</Button>
      </EmptyState>
    </main>
  );
}
