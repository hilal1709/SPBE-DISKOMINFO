"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import "aos/dist/aos.css";

/** Modul AOS dipisah dari bundel awal, tetapi langsung diminta begitu modul ini dievaluasi di browser. */
let aos: Promise<Aos.Aos> | undefined;
const loadAos = () => (aos ??= import("aos").then((mod) => mod.default));
if (typeof window !== "undefined") loadAos();

/**
 * Menyalakan AOS sekali untuk seluruh aplikasi. Pakai atribut `data-aos` untuk reveal deklaratif
 * (juga di server component), mis. `data-aos="fade-blur"`. Mati otomatis saat prefers-reduced-motion.
 */
export function AosInit() {
  const pathname = usePathname();

  useEffect(() => {
    loadAos().then((AOS) =>
      AOS.init({
        once: true,
        duration: 600,
        easing: "ease-out-cubic",
        offset: 24,
        disable: () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      }),
    );
  }, []);

  // Elemen di halaman baru perlu dipindai ulang setelah navigasi client-side.
  useEffect(() => {
    loadAos().then((AOS) => AOS.refreshHard());
  }, [pathname]);

  return null;
}
