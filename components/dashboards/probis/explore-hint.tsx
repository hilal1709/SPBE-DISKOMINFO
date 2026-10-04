"use client";
import { useEffect, useRef, useState } from "react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/icon";
import { Illustration } from "@/components/illustrations/illustration";
import { MOTION_OK, gsap, useGSAP } from "@/components/motion/gsap";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const KEY = "spbe:probis-hint";

/** Kartu sambutan berilustrasi yang menjelaskan interaksi dashboard. Bisa ditutup dan diingat per peramban. */
export function ExploreHint({ sample }: { sample: boolean }) {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(KEY) === "1";
    } catch {}
    // Dibaca setelah mount agar render server dan klien sama.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!dismissed) setShow(true);
  }, []);

  useGSAP(
    () => {
      if (!show) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.from(ref.current, { opacity: 0, y: -10, duration: 0.5, ease: "power3.out" });
        gsap.from("[data-tip]", { opacity: 0, x: -8, stagger: 0.08, delay: 0.2, duration: 0.4 });
      });
    },
    { dependencies: [show], scope: ref },
  );

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
    <Card ref={ref} className="relative flex-row items-center gap-4 overflow-hidden border-0 bg-accent py-3 pr-12 pl-3 sm:gap-6">
      <Illustration name="explore" className="hidden w-32 shrink-0 sm:block" />
      <div className="grid gap-1.5 text-sm text-accent-foreground">
        <p className="font-semibold">
          {sample && <span className="mr-2 rounded-full bg-brand-charcoal px-2.5 py-0.5 text-[11px] font-bold text-white">Data contoh</span>}
          Dashboard ini interaktif
        </p>
        <ul className="grid gap-1 text-xs">
          <li data-tip>Klik petak treemap atau nama Perangkat Daerah untuk memfilter seluruh dashboard.</li>
          <li data-tip>Klik baris katalog untuk melihat detail probis, IKU, dan klasifikasi RAB.</li>
          <li data-tip>Tautan halaman menyimpan filter, jadi bisa langsung dibagikan.</li>
        </ul>
      </div>
      <Button variant="ghost" size="icon-sm" onClick={close} aria-label="Tutup petunjuk" className="absolute top-2 right-2 transition-transform hover:rotate-90">
        <Icon icon={Cancel01Icon} size={14} />
      </Button>
    </Card>
  );
}
