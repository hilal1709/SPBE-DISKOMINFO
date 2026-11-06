"use client";
import { A11y, Autoplay, EffectFade, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/effect-fade";
import "swiper/css/pagination";
import { Illustration, type IllustrationName } from "@/components/illustrations/illustration";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const slides: { art: IllustrationName; title: string; text: string }[] = [
  { art: "domain-integration", title: "Lima domain arsitektur", text: "Proses bisnis, layanan, data, aplikasi, dan infrastruktur dalam satu peta." },
  { art: "building", title: "Seluruh Perangkat Daerah", text: "Setiap OPD memperbarui datanya sendiri, diverifikasi sebelum terbit." },
  { art: "roadmap", title: "Peta rencana & integrasi", text: "Kesenjangan, rencana, dan integrasi antarsistem terpantau." },
];

/** Carousel sorotan di panel login (Swiper, efek fade). Dimuat terpisah lewat dynamic() di app/login/page.tsx. */
export default function LoginHighlights() {
  const reduced = useReducedMotion();
  return (
    <Swiper
      modules={[A11y, Autoplay, EffectFade, Pagination]}
      effect="fade"
      fadeEffect={{ crossFade: true }}
      loop
      autoplay={reduced ? false : { delay: 4500, disableOnInteraction: false, pauseOnMouseEnter: true }}
      pagination={{ clickable: true }}
      a11y={{ paginationBulletMessage: "Ke sorotan {{index}}" }}
      className="login-highlights !pb-7"
    >
      {slides.map((slide) => (
        <SwiperSlide key={slide.title}>
          <div className="flex items-center gap-4 rounded-2xl border border-white/60 bg-white/55 p-3 pr-5 shadow-raised backdrop-blur-md">
            <Illustration name={slide.art} className="w-24 shrink-0" />
            <div>
              <p className="text-sm font-bold">{slide.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-brand-charcoal/70">{slide.text}</p>
            </div>
          </div>
        </SwiperSlide>
      ))}
    </Swiper>
  );
}
