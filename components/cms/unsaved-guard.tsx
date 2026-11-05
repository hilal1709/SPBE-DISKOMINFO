"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

/**
 * Peringatan saat meninggalkan formulir yang belum disimpan (B15): menutup/memuat ulang tab memakai dialog bawaan
 * peramban, sedangkan klik tautan di dalam aplikasi memakai dialog design system. Pola sama dengan editor diagram.
 * `values` dibandingkan dengan nilai awal; `saved` true setelah simpan berhasil.
 */
export function UnsavedGuard({ values, saved }: { values: unknown; saved: boolean }) {
  const router = useRouter();
  const [initial] = useState(() => JSON.stringify(values));
  const dirty = !saved && JSON.stringify(values) !== initial;
  const [leaving, setLeaving] = useState<string | null>(null);
  const latest = useRef(dirty);
  useEffect(() => {
    latest.current = dirty;
  }, [dirty]);

  useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (!latest.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    // Fase capture di document berjalan sebelum handler <Link>, sehingga navigasi bisa ditahan dulu.
    const click = (e: MouseEvent) => {
      if (!latest.current || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || (url.pathname === window.location.pathname && url.search === window.location.search)) return;
      e.preventDefault();
      e.stopPropagation();
      setLeaving(url.pathname + url.search + url.hash);
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", click, true);
    };
  }, []);

  return (
    <AlertDialog open={leaving !== null} onOpenChange={(open) => !open && setLeaving(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Tinggalkan tanpa menyimpan?</AlertDialogTitle>
          <AlertDialogDescription>Isian yang belum disimpan akan hilang. Simpan draf dulu bila ingin melanjutkan nanti.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Tetap di sini</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              latest.current = false;
              const href = leaving!;
              setLeaving(null);
              router.push(href);
            }}
          >
            Tinggalkan
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
