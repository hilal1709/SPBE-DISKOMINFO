"use client";
import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-js/dist/assets/bpmn-js.css";
import "./bpmn-theme.css";
import { useEffect, useRef, useState } from "react";
import NavigatedViewer from "bpmn-js/lib/NavigatedViewer";
import { EmptyState } from "@/components/blocks/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { loadAnime, motionOk } from "@/components/motion/anime-lazy";
import { cn } from "@/lib/utils";
import { rendererColors } from "./diagram-model";

/**
 * Diagram BPMN hanya-baca (geser & zoom dengan roda/drag). `xml` langsung, atau `src` untuk dimuat lazy.
 * `draw` = alur digambar ulang dengan anime.js saat pertama tampil (portal).
 */
export function BpmnViewer({ xml, src, draw = false, className }: { xml?: string | null; src?: string; draw?: boolean; className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    if (!host.current) return;
    const viewer = new NavigatedViewer({ container: host.current, bpmnRenderer: rendererColors() });
    let active = true;
    (async () => {
      try {
        const source = xml ?? (src ? await fetch(src).then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status))))) : null);
        if (!source) throw new Error("Diagram kosong");
        await viewer.importXML(source);
        if (!active) return;
        (viewer.get("canvas") as { zoom: (v: string, center: string) => void }).zoom("fit-viewport", "auto");
        setState("ready");
        if (draw && motionOk()) {
          const { animate, svg, stagger } = await loadAnime();
          const paths = host.current?.querySelectorAll<SVGPathElement>(".djs-connection .djs-visual path");
          if (active && paths?.length) animate(svg.createDrawable(paths), { draw: ["0 0", "0 1"], duration: 900, delay: stagger(120), ease: "inOut(2)" });
        }
      } catch {
        if (active) setState("error");
      }
    })();
    return () => {
      active = false;
      viewer.destroy();
    };
  }, [xml, src, draw]);

  return (
    <div className={cn("bpmn-surface relative overflow-hidden rounded-xl border bg-white text-brand-charcoal", className)}>
      <div ref={host} className={cn("size-full", state === "error" && "hidden")} />
      {state === "loading" && <Skeleton className="absolute inset-3" />}
      {state === "error" && <EmptyState illustration="error" size="sm" title="Diagram tidak dapat ditampilkan" className="absolute inset-0" />}
    </div>
  );
}
