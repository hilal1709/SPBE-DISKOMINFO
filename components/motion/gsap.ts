"use client";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger);
gsap.defaults({ ease: "power3.out", duration: 0.5 });

/** Bungkus animasi dekoratif dengan ini agar otomatis mati saat prefers-reduced-motion. */
export const MOTION_OK = "(prefers-reduced-motion: no-preference)";

export const motion = {
  fast: 0.2,
  base: 0.45,
  slow: 0.9,
  stagger: 0.06,
} as const;

export { gsap, ScrollTrigger, useGSAP };
