"use client";
/**
 * anime.js untuk komponen yang tampil di setiap halaman (logo, judul header): dipisah dari bundel awal
 * dan langsung diminta saat modul ini dievaluasi, jadi biasanya sudah siap ketika efek animasi berjalan.
 */
let anime: Promise<typeof import("./anime")> | undefined;
export const loadAnime = () => (anime ??= import("./anime"));
if (typeof window !== "undefined") loadAnime();

export const motionOk = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: no-preference)").matches;
