"use client";
/**
 * anime.js untuk animasi SVG dan teks (logo, judul). Interaksi UI lain tetap memakai GSAP.
 * Selalu cek `motionOk()` sebelum menjalankan animasi dekoratif.
 */
export { animate, createTimeline, splitText, stagger, utils } from "animejs";

export const motionOk = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: no-preference)").matches;
