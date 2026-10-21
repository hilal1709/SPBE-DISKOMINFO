"use client";
import { A11y, Keyboard, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/pagination";

/** Carousel Swiper untuk StatRow. Dimuat terpisah (components/blocks/stat-row.tsx), hanya di layar < xl. */
export default function StatRowSwiper({ slides }: { slides: React.ReactNode[] }) {
  return (
    <Swiper
      modules={[A11y, Keyboard, Pagination]}
      slidesPerView={1.15}
      spaceBetween={12}
      keyboard={{ enabled: true, onlyInViewport: true }}
      pagination={{ clickable: true }}
      a11y={{ prevSlideMessage: "Kartu sebelumnya", nextSlideMessage: "Kartu berikutnya", paginationBulletMessage: "Ke kartu {{index}}" }}
      breakpoints={{
        640: { slidesPerView: 2.1, spaceBetween: 16 },
        1024: { slidesPerView: 2.6, spaceBetween: 16 },
        1280: { slidesPerView: slides.length, spaceBetween: 16, enabled: false },
      }}
      className="!px-1 !pt-1 !pb-8 xl:!pb-1"
    >
      {slides.map((child, i) => (
        <SwiperSlide key={i} className="!h-auto *:h-full">
          {child}
        </SwiperSlide>
      ))}
    </Swiper>
  );
}
