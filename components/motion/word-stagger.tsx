"use client";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { loadAnime, motionOk } from "./anime-lazy";

/**
 * Teks yang muncul kata demi kata dengan blur dan naik sedikit (pola "words stagger" 21st.dev, anime.js).
 * Diputar ulang setiap kali teks berubah, mis. judul header saat berpindah halaman.
 */
export function WordStagger({ text, as: Tag = "span", className }: { text: string; as?: "span" | "h1" | "h2" | "p"; className?: string }) {
  return <Words key={text} text={text} Tag={Tag} className={className} />;
}

function Words({ text, Tag, className }: { text: string; Tag: "span" | "h1" | "h2" | "p"; className?: string }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!ref.current || !motionOk()) return;
    let undo: (() => void) | undefined;
    let active = true;
    loadAnime().then(({ animate, splitText, stagger }) => {
      if (!active || !ref.current) return;
      const split = splitText(ref.current, { words: { wrap: "clip" } });
      const animation = animate(split.words, {
        opacity: [0, 1],
        y: ["60%", "0%"],
        filter: ["blur(6px)", "blur(0px)"],
        duration: 650,
        delay: stagger(55),
        ease: "out(3)",
      });
      undo = () => {
        animation.revert();
        split.revert();
      };
    });
    return () => {
      active = false;
      undo?.();
    };
  }, []);

  return (
    <Tag ref={ref as never} className={cn(className)}>
      {text}
    </Tag>
  );
}
