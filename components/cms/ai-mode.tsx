"use client";
import { createContext, useContext, useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

/** true bila server memakai Gemini (GEMINI_API_KEY); false = saran lokal berbasis kata kunci. */
const AiMode = createContext(false);

export function AiModeProvider({ gemini, children }: { gemini: boolean; children: React.ReactNode }) {
  return <AiMode.Provider value={gemini}>{children}</AiMode.Provider>;
}

/** Label tombol saran sesuai cara kerjanya (B12): "AI" hanya bila Gemini aktif. */
export function SuggestLabel() {
  return <>{useContext(AiMode) ? "Isi dengan AI" : "Saran otomatis"}</>;
}

/** Teks toast saat saran disusun. */
export const SUGGEST_LOADING = "Menyusun saran…";

/** "Pakai semua" menimpa beberapa kolom sekaligus, jadi diminta konfirmasi; saran per kolom tetap bisa dipakai satu per satu. */
export function ApplyAllButton({ onConfirm }: { onConfirm: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>Pakai semua</Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pakai semua saran?</AlertDialogTitle>
            <AlertDialogDescription>Isian yang sudah ada pada kolom terkait akan ditimpa. Tinjau hasilnya sebelum menyimpan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirm}>Pakai semua</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
