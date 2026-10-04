"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { clearSamples } from "@/app/cms/actions";
import { Banner } from "@/components/blocks/banner";
import { Button } from "@/components/ui/button";

const fmt = new Intl.NumberFormat("id-ID");

/** Pemberitahuan data contoh aktif; tim Diskominfo dapat menghapusnya sebelum data asli diimpor. */
export function SampleBanner({ count, canClear }: { count: number; canClear: boolean }) {
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  const clear = () =>
    start(async () => {
      const result = await clearSamples();
      if (!result.ok) return void toast.error(result.error);
      toast.success("Data contoh dihapus", { description: `${fmt.format(result.data.removed)} probis contoh dihapus.` });
    });

  return (
    <Banner
      variant="info"
      label="Data contoh"
      dismissible
      action={
        canClear && (
          <Button size="sm" variant={confirm ? "destructive" : "outline"} loading={pending} onClick={() => (confirm ? clear() : setConfirm(true))} onBlur={() => setConfirm(false)}>
            {confirm ? "Yakin hapus semua?" : "Hapus data contoh"}
          </Button>
        )
      }
    >
      {fmt.format(count)} probis contoh sedang tampil di CMS dan portal. Hapus sebelum mengimpor data asli.
    </Banner>
  );
}
