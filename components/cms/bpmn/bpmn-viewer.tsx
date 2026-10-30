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
import { rendererColors, typeLabel } from "./diagram-model";

type Element = { id: string; type: string; x: number; y: number; labelTarget?: unknown; businessObject?: { name?: string; documentation?: { text?: string }[] } };
type Note = { id: string; type: string; name: string; text: string };
type Services = {
  canvas: { zoom: (v: string, center: string) => void; addMarker: (id: string, cls: string) => void; removeMarker: (id: string, cls: string) => void; scrollToElement: (id: string, padding?: number) => void };
  elementRegistry: { filter: (fn: (e: Element) => boolean) => Element[]; getGraphics: (id: string) => SVGElement | undefined };
  overlays: { add: (id: string, type: string, o: { position: Record<string, number>; html: string }) => void };
  eventBus: { on: (event: string, cb: (e: { element: Element }) => void) => void };
};

const MARKER = "doc-active";

/** Elemen yang punya dokumentasi, urut kiri→kanan lalu atas→bawah (arah baca diagram). */
function collectNotes(registry: Services["elementRegistry"]): Note[] {
  return registry
    .filter((e) => !e.labelTarget && !!e.businessObject?.documentation?.[0]?.text?.trim())
    .sort((a, b) => (a.x ?? 0) - (b.x ?? 0) || (a.y ?? 0) - (b.y ?? 0))
    .map((e) => ({ id: e.id, type: e.type, name: e.businessObject?.name?.trim() || typeLabel(e.type), text: e.businessObject!.documentation![0].text!.trim() }));
}

/**
 * Diagram BPMN hanya-baca (geser & zoom dengan roda/drag). `xml` langsung, atau `src` untuk dimuat lazy.
 * `draw` = alur digambar ulang dengan anime.js saat pertama tampil (portal).
 * Elemen berdokumentasi diberi penanda; isinya tampil saat disorot/diketuk dan sebagai daftar keterangan di bawah diagram.
 */
export function BpmnViewer({ xml, src, draw = false, className }: { xml?: string | null; src?: string; draw?: boolean; className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const services = useRef<Services | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [notes, setNotes] = useState<Note[]>([]);
  const [tip, setTip] = useState<{ note: Note; left: number; top?: number; bottom?: number } | null>(null);
  const pinned = useRef<string | null>(null);
  const marked = useRef<string | null>(null);

  /** Sorot elemen di kanvas dan tampilkan keterangannya tepat di bawah elemen. */
  const show = (note: Note | null) => {
    const s = services.current;
    if (!s) return;
    if (marked.current) s.canvas.removeMarker(marked.current, MARKER);
    marked.current = null;
    const gfx = note && s.elementRegistry.getGraphics(note.id);
    if (!note || !gfx || !surface.current) return setTip(null);
    s.canvas.addMarker(note.id, MARKER);
    marked.current = note.id;
    const box = gfx.getBoundingClientRect();
    const wrap = surface.current.getBoundingClientRect();
    const width = Math.min(288, wrap.width - 16);
    const left = Math.min(Math.max(8, box.left - wrap.left), wrap.width - width - 8);
    // Ruang di bawah elemen kurang → tampil di atasnya agar tidak terpotong tepi kanvas.
    const below = wrap.bottom - box.bottom > 160;
    setTip({ note, left, ...(below ? { top: box.bottom - wrap.top + 8 } : { bottom: wrap.bottom - box.top + 8 }) });
  };

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
        const get = <K extends keyof Services>(name: K) => viewer.get(name) as Services[K];
        services.current = { canvas: get("canvas"), elementRegistry: get("elementRegistry"), overlays: get("overlays"), eventBus: get("eventBus") };
        get("canvas").zoom("fit-viewport", "auto");

        const found = collectNotes(get("elementRegistry"));
        const byId = new Map(found.map((n) => [n.id, n]));
        for (const n of found) get("overlays").add(n.id, "doc-badge", { position: { top: -8, right: 8 }, html: '<span class="bpmn-doc-badge" aria-hidden="true">i</span>' });
        const bus = get("eventBus");
        bus.on("element.hover", (e) => !pinned.current && byId.has(e.element.id) && show(byId.get(e.element.id)!));
        bus.on("element.out", (e) => !pinned.current && byId.has(e.element.id) && show(null));
        // Ketuk = sematkan (layar sentuh); ketuk lagi atau ketuk area kosong = tutup.
        bus.on("element.click", (e) => {
          const note = byId.get(e.element.id);
          pinned.current = note && pinned.current !== note.id ? note.id : null;
          show(pinned.current ? note! : null);
        });
        bus.on("canvas.viewbox.changing", () => {
          pinned.current = null;
          show(null);
        });
        setNotes(found);
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
      services.current = null;
      pinned.current = null;
      marked.current = null;
      setTip(null);
      setNotes([]);
      viewer.destroy();
    };
  }, [xml, src, draw]);

  /** Dari daftar: geser kanvas ke elemen lalu tampilkan keterangannya. */
  const focus = (note: Note) => {
    services.current?.canvas.scrollToElement(note.id, 80);
    pinned.current = note.id;
    requestAnimationFrame(() => show(note));
  };

  return (
    <div className="grid gap-3">
      <div ref={surface} className={cn("bpmn-surface relative overflow-hidden rounded-xl border bg-white text-brand-charcoal", className)}>
        <div ref={host} className={cn("size-full", state === "error" && "hidden")} />
        {state === "loading" && <Skeleton className="absolute inset-3" />}
        {state === "error" && <EmptyState illustration="error" size="sm" title="Diagram tidak dapat ditampilkan" className="absolute inset-0" />}
        {tip && (
          <div role="tooltip" className="pointer-events-none absolute z-20 w-72 max-w-[calc(100%-1rem)] rounded-lg border bg-popover p-3 text-popover-foreground shadow-lg" style={{ left: tip.left, top: tip.top, bottom: tip.bottom }}>
            <p className="text-sm font-medium">{tip.note.name}</p>
            <p className="mt-1 line-clamp-6 text-xs whitespace-pre-line text-muted-foreground">{tip.note.text}</p>
          </div>
        )}
      </div>
      {notes.length > 0 && (
        <section aria-labelledby="bpmn-notes-title" className="grid gap-2">
          <h4 id="bpmn-notes-title" className="text-sm font-medium">Keterangan langkah</h4>
          <ol className="grid gap-1.5">
            {notes.map((n, i) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => focus(n)}
                  aria-pressed={tip?.note.id === n.id}
                  className="grid w-full grid-cols-[1.5rem_minmax(0,1fr)] gap-x-2 rounded-lg border p-2.5 text-left transition-colors hover:bg-muted/60 aria-pressed:border-primary aria-pressed:bg-primary/5"
                >
                  <span className="grid size-6 place-items-center rounded-full bg-primary/10 text-xs font-medium text-primary tabular-nums">{i + 1}</span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">
                      {n.name} <span className="font-normal text-muted-foreground">· {typeLabel(n.type)}</span>
                    </span>
                    <span className="mt-0.5 block text-xs whitespace-pre-line text-muted-foreground">{n.text}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
