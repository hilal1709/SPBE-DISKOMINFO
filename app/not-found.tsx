import Link from "next/link";
import { EmptyState } from "@/components/blocks/empty-state";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-svh place-items-center p-6">
      <EmptyState
        illustration="not-found"
        size="lg"
        title="Halaman tidak ditemukan"
        description="Alamat yang Anda tuju tidak ada atau sudah dipindahkan. Periksa kembali tautannya atau mulai dari beranda."
      >
        <Button asChild><Link href="/">Ke beranda portal</Link></Button>
      </EmptyState>
    </main>
  );
}
