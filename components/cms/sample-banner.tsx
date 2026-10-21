"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { clearSamples } from "@/app/cms/actions";
import { Banner } from "@/components/blocks/banner";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";


/** Pemberitahuan data contoh aktif; tim Diskominfo dapat menghapusnya sebelum data asli diimpor. */
export function SampleBanner({
  count,
  probis,
  layanan,
  data = 0,
  aplikasi = 0,
  infrastruktur = 0,
  keamanan = 0,
  rencana = 0,
  gap = 0,
  canClear,
}: {
  count: number;
  probis: number;
  layanan: number;
  data?: number;
  aplikasi?: number;
  infrastruktur?: number;
  keamanan?: number;
  rencana?: number;
  gap?: number;
  canClear: boolean;
}) {
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  const clear = () =>
    start(async () => {
      const result = await clearSamples();
      if (!result.ok) return void toast.error(result.error);
      toast.success("Data contoh dihapus", { description: `${formatNumber(result.data.removed)} data contoh dihapus.` });
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
      {[probis && `${formatNumber(probis)} probis`, layanan && `${formatNumber(layanan)} layanan`, data && `${formatNumber(data)} data`, aplikasi && `${formatNumber(aplikasi)} aplikasi`, infrastruktur && `${formatNumber(infrastruktur)} infrastruktur`, keamanan && `${formatNumber(keamanan)} kegiatan keamanan`, rencana && `${formatNumber(rencana)} peta rencana`, gap && `${formatNumber(gap)} temuan gap`].filter(Boolean).join(", ") || formatNumber(count)} contoh sedang tampil di CMS dan portal. Hapus sebelum mengimpor data asli.
    </Banner>
  );
}
