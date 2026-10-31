"use client";
import { useEffect, useRef, useState } from "react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/icon";
import { Illustration, type IllustrationName } from "@/components/illustrations/illustration";
import { MOTION_OK, gsap } from "@/components/motion/gsap";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const probisTips = [
  "Klik petak treemap atau nama Perangkat Daerah untuk memfilter seluruh dashboard.",
  "Klik baris katalog untuk melihat detail probis, IKU, dan klasifikasi RAB.",
  "Tautan halaman menyimpan filter, jadi bisa langsung dibagikan.",
];

/** Kartu sambutan berilustrasi yang menjelaskan interaksi dashboard. Bisa ditutup selama kunjungan saat ini; tampil lagi saat halaman dikunjungi kembali. */
export function ExploreHint({
  sample,
  illustration = "explore",
  tips = probisTips,
  title = "Dashboard ini interaktif",
  description,
}: {
  sample: boolean;
  illustration?: IllustrationName;
  tips?: string[];
  title?: string;
  description?: string;
}) {
  const [show, setShow] = useState(true);
  const ref = useRef<HTMLDivElement>(null);
  const closing = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    // Next.js dapat mengaktifkan kembali halaman yang disimpan tanpa mereset state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShow(true);
    const card = ref.current;
    return () => {
      closing.current?.kill();
      closing.current = null;
      if (card) gsap.set(card, { clearProps: "height,opacity,marginBottom,paddingTop,paddingBottom" });
    };
  }, []);

  const close = () => {
    if (closing.current) return;
    if (window.matchMedia(MOTION_OK).matches) {
      closing.current = gsap.to(ref.current, { height: 0, opacity: 0, marginBottom: -20, paddingTop: 0, paddingBottom: 0, duration: 0.4, ease: "power2.inOut", onComplete: () => { closing.current = null; setShow(false); } });
    } else {
      setShow(false);
    }
  };

  if (!show) return null;

  return (
    <Card ref={ref} data-reveal className="relative flex-row items-center gap-4 overflow-hidden border-0 bg-accent py-3 pr-12 pl-3 sm:gap-6">
      <Illustration name={illustration} className="w-20 shrink-0 sm:w-32" />
      <div className="grid gap-1.5 text-sm text-accent-foreground">
        <p className="font-semibold">
          {sample && <span className="mr-2 rounded-full bg-brand-charcoal px-2.5 py-0.5 text-[11px] font-bold text-white">Data contoh</span>}
          {title}
        </p>
        {description && <p className="text-xs leading-relaxed">{description}</p>}
        {!!tips.length && <ul className="grid gap-1 text-xs">
          {tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>}
      </div>
      <Button variant="ghost" size="icon-sm" onClick={close} aria-label="Tutup petunjuk" className="absolute top-2 right-2 transition-transform hover:rotate-90">
        <Icon icon={Cancel01Icon} size={14} />
      </Button>
    </Card>
  );
}
