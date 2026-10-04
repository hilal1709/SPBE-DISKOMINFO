"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { LottieHandle, LottieSvgProps } from "lottie-react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

// Build svg saja (lebih kecil), dimuat hanya di klien.
const Lottie = dynamic<LottieSvgProps>(() => import("lottie-react").then((mod) => mod.LottieSvg as React.ComponentType<LottieSvgProps>), { ssr: false });

/**
 * Katalog ilustrasi Lottie. Sumber animasi ada di scripts/lottie/build.mjs —
 * ubah di sana lalu jalankan `pnpm illustrations` untuk membuat ulang JSON-nya.
 */
const catalog = {
  loader: { load: () => import("./data/loader.json"), ratio: "1", still: 45 },
  empty: { load: () => import("./data/empty.json"), ratio: "4 / 3", still: 0 },
  "login-hero": { load: () => import("./data/login-hero.json"), ratio: "480 / 420", still: 0 },
  "not-found": { load: () => import("./data/not-found.json"), ratio: "4 / 3", still: 100 },
  error: { load: () => import("./data/error.json"), ratio: "4 / 3", still: 0 },
  building: { load: () => import("./data/building.json"), ratio: "4 / 3", still: 120 },
  success: { load: () => import("./data/success.json"), ratio: "1", still: 89 },
} as const;

export type IllustrationName = keyof typeof catalog;
export const illustrationNames = Object.keys(catalog) as IllustrationName[];

type Props = {
  name: IllustrationName;
  /** Teks alternatif. Kosongkan bila ilustrasi murni dekoratif. */
  label?: string;
  loop?: boolean;
  className?: string;
};

export function Illustration({ name, label, loop = true, className }: Props) {
  const [data, setData] = useState<object | null>(null);
  const lottie = useRef<LottieHandle>(null);
  const reduced = useReducedMotion();
  const entry = catalog[name];

  useEffect(() => {
    let active = true;
    entry.load().then((mod) => active && setData(mod.default));
    return () => { active = false; };
  }, [entry]);

  return (
    <div
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("relative", className)}
      style={{ aspectRatio: entry.ratio }}
    >
      {data && (
        <Lottie
          lottieRef={lottie}
          src={data}
          loop={loop && !reduced}
          autoplay={!reduced}
          subscriptions={{ ready: () => { if (reduced) lottie.current?.seek(entry.still); } }}
          className="absolute inset-0 animate-in duration-500 fade-in"
        />
      )}
    </div>
  );
}
