"use client";
import { Children, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type SwiperRow = typeof import("./stat-row-swiper").default;

/** Swiper hanya dipakai di bawah xl (mulai xl carousel nonaktif dan tampil sebagai grid). */
const CAROUSEL = "(max-width: 1279.98px)";

/**
 * Deretan StatCard. Di layar sempit menjadi carousel geser (Swiper) dengan tepi kartu berikutnya
 * mengintip (pola "snap carousel" 21st.dev); mulai xl tampil sebagai grid empat kolom biasa.
 *
 * HTML server memakai deretan scroll-snap CSS dengan ukuran sama persis dengan Swiper, jadi kartu langsung
 * tampil tanpa menunggu JavaScript. Swiper (pagination & keyboard) dimuat setelah halaman senggang dan
 * menggantikannya tanpa pergeseran; di desktop tidak dimuat sama sekali.
 */
export function StatRow({ children, className }: { children: React.ReactNode; className?: string }) {
  const slides = Children.toArray(children);
  const [Carousel, setCarousel] = useState<SwiperRow | null>(null);

  useEffect(() => {
    const media = window.matchMedia(CAROUSEL);
    let active = true;
    let cancel = () => {};
    const load = () => {
      if (!media.matches) return;
      const start = () => import("./stat-row-swiper").then((mod) => active && setCarousel(() => mod.default));
      if (typeof requestIdleCallback === "function") {
        const id = requestIdleCallback(start, { timeout: 2000 });
        cancel = () => cancelIdleCallback(id);
      } else {
        const id = setTimeout(start, 200);
        cancel = () => clearTimeout(id);
      }
    };
    load();
    media.addEventListener("change", load);
    return () => {
      active = false;
      media.removeEventListener("change", load);
      cancel();
    };
  }, []);

  return (
    <section className={cn("stat-row -mx-1 min-w-0", Carousel && "stat-row-live", className)}>
      {Carousel ? (
        <Carousel slides={slides} />
      ) : (
        // Ukuran slide = rumus Swiper: (lebar − (n−1) × jarak) / n, dengan n = slidesPerView tiap breakpoint.
        <div className="stat-row-static flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pt-1 pb-8 sm:gap-4 xl:pb-1">
          {slides.map((child, i) => (
            <div key={i} className="shrink-0 basis-[calc((100%-1.8px)/1.15)] snap-start *:h-full sm:basis-[calc((100%-17.6px)/2.1)] lg:basis-[calc((100%-25.6px)/2.6)] xl:flex-1 xl:basis-0">
              {child}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
