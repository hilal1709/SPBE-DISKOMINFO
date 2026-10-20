"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import AOS from "aos";
import "aos/dist/aos.css";

/**
 * Menyalakan AOS sekali untuk seluruh aplikasi. Pakai atribut `data-aos` untuk reveal deklaratif
 * (juga di server component), mis. `data-aos="fade-blur"`. Mati otomatis saat prefers-reduced-motion.
 */
export function AosInit() {
  const pathname = usePathname();

  useEffect(() => {
    AOS.init({
      once: true,
      duration: 600,
      easing: "ease-out-cubic",
      offset: 24,
      disable: () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    });
  }, []);

  // Elemen di halaman baru perlu dipindai ulang setelah navigasi client-side.
  useEffect(() => {
    AOS.refreshHard();
  }, [pathname]);

  return null;
}
