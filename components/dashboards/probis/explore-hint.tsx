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

/** Kartu sambutan berilustrasi yang menjelaskan interaksi dashboard. Bisa ditutup dan diingat per peramban. */
export function ExploreHint({
  sample,
  storageKey: KEY = "spbe:probis-hint",
  illustration = "explore",
  tips = probisTips,
}: {
  sample: boolean;
  /** Kunci localStorage, satu per dashboard. */
  storageKey?: string;
  illustration?: IllustrationName;
  tips?: string[];
}) {
  // Ikut dirender server agar tata letak tidak bergeser saat muncul; kartu yang pernah ditutup sudah
  // disembunyikan sebelum tampil oleh HINT_SCRIPT (app/layout.tsx), lalu dilepas setelah mount.
  const [show, setShow] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(KEY) === "1";
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (dismissed) setShow(false);
  }, [KEY]);

  const close = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
    let animated = false;
    gsap.matchMedia().add(MOTION_OK, () => {
      animated = true;
      gsap.to(ref.current, { height: 0, opacity: 0, marginBottom: -20, paddingTop: 0, paddingBottom: 0, duration: 0.4, ease: "power2.inOut", onComplete: () => setShow(false) });
    });
    if (!animated) setShow(false);
  };

  if (!show) return null;

  return (
    <Card ref={ref} data-hint={KEY} data-reveal className="relative flex-row items-center gap-4 overflow-hidden border-0 bg-accent py-3 pr-12 pl-3 sm:gap-6">
      <Illustration name={illustration} className="hidden w-32 shrink-0 sm:block" />
      <div className="grid gap-1.5 text-sm text-accent-foreground">
        <p className="font-semibold">
          {sample && <span className="mr-2 rounded-full bg-brand-charcoal px-2.5 py-0.5 text-[11px] font-bold text-white">Data contoh</span>}
          Dashboard ini interaktif
        </p>
        <ul className="grid gap-1 text-xs">
          {tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </div>
      <Button variant="ghost" size="icon-sm" onClick={close} aria-label="Tutup petunjuk" className="absolute top-2 right-2 transition-transform hover:rotate-90">
        <Icon icon={Cancel01Icon} size={14} />
      </Button>
    </Card>
  );
}
