"use client";
import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-js/dist/assets/bpmn-js.css";
import "bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css";
import "./bpmn-theme.css";
import { useCallback, useEffect, useRef, useState } from "react";
import Modeler from "bpmn-js/lib/Modeler";
import { CreateAppendAnythingModule } from "bpmn-js-create-append-anything";
import { toast } from "sonner";
import { saveProbisDiagram } from "@/app/cms/actions";
import { EmptyState } from "@/components/blocks/empty-state";
import { Illustration } from "@/components/illustrations/illustration";
import { MOTION_OK, gsap, useGSAP } from "@/components/motion/gsap";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { DiagramStats } from "./diagram-stats";
import { countElements, download, rendererColors, starterXml, svgToPng, type DiagramStats as Stats } from "./diagram-model";
import { EditorDock, type EditorTool } from "./editor-dock";
import { ElementPanel, type SelectedElement } from "./element-panel";

/* Layanan bpmn-js/diagram-js yang dipakai (tipe minimal). */
type Shape = { id: string; type: string; labelTarget?: Shape; businessObject: { id: string; name?: string; documentation?: { text?: string }[] } };
type Services = {
  canvas: { zoom: (level?: number | "fit-viewport", center?: "auto") => number; getRootElement: () => Shape };
  commandStack: { canUndo: () => boolean; canRedo: () => boolean; undo: () => void; redo: () => void };
  editorActions: { trigger: (action: string, opts?: unknown) => void };
  elementRegistry: { getAll: () => Shape[]; get: (id: string) => Shape | undefined };
  modeling: { updateProperties: (el: Shape, props: Record<string, unknown>) => void };
  moddle: { create: (type: string, attrs: Record<string, unknown>) => unknown };
  dragging: { cancel: () => void };
};

const MAX_IMPORT = 2_000_000;
const TOOL_ACTIONS: Record<Exclude<EditorTool, "select">, string> = { hand: "handTool", lasso: "lassoTool", connect: "globalConnectTool" };
const TOOL_NAMES: Record<string, EditorTool> = { hand: "hand", lasso: "lasso", "global-connect": "connect" };

const describe = (el: Shape | undefined): SelectedElement | null => {
  const target = el?.labelTarget ?? el;
  if (!target) return null;
  const bo = target.businessObject;
  return { id: bo.id, type: target.type, name: bo.name ?? "", documentation: bo.documentation?.[0]?.text ?? "" };
};

type Props = { id: string; code: string; name: string; initialXml: string | null; onDirty: (dirty: boolean) => void };

/** Editor BPMN (bpmn-js Modeler) dengan dock alat, panel properti, ringkasan elemen, impor/ekspor, dan simpan. */
export default function BpmnEditor({ id, code, name, initialXml, onDirty }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const celebrate = useRef<HTMLDivElement>(null);
  const modeler = useRef<Modeler | null>(null);
  const loading = useRef(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [tool, setTool] = useState<EditorTool>("select");
  const [zoom, setZoom] = useState(1);
  const [history, setHistory] = useState({ undo: false, redo: false });
  const [dirty, setDirtyState] = useState(!initialXml);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(Boolean(initialXml));
  const [selected, setSelected] = useState<SelectedElement | null>(null);
  const [stats, setStats] = useState<Stats>({ activities: 0, gateways: 0, events: 0, lanes: 0 });
  const [panelOpen, setPanelOpen] = useState(false);
  const [pendingImport, setPendingImport] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const get = useCallback(<K extends keyof Services>(key: K) => modeler.current!.get(key) as Services[K], []);
  const setDirty = useCallback(
    (value: boolean) => {
      setDirtyState(value);
      onDirty(value);
    },
    [onDirty],
  );

  const sync = useCallback(() => {
    const registry = get("elementRegistry");
    setStats(countElements(registry.getAll().filter((el) => !el.labelTarget).map((el) => el.type)));
    setHistory({ undo: get("commandStack").canUndo(), redo: get("commandStack").canRedo() });
    setSelected((current) => (current ? describe(registry.get(current.id)) : null));
  }, [get]);

  const load = useCallback(
    async (xml: string) => {
      loading.current = true;
      try {
        await modeler.current!.importXML(xml);
        get("canvas").zoom("fit-viewport", "auto");
        setFailed(false);
        setSelected(null);
        sync();
      } finally {
        loading.current = false;
      }
    },
    [get, sync],
  );

  useEffect(() => {
    const m = new Modeler({ container: host.current!, bpmnRenderer: rendererColors(), additionalModules: [CreateAppendAnythingModule] });
    modeler.current = m;
    const on = m.on.bind(m) as (event: string, cb: (e: Record<string, unknown>) => void) => void;
    on("commandStack.changed", () => {
      sync();
      if (!loading.current) setDirty(true);
    });
    on("canvas.viewbox.changed", () => setZoom(get("canvas").zoom()));
    on("selection.changed", (e) => {
      const list = e.newSelection as Shape[];
      setSelected(list.length === 1 ? describe(list[0]) : null);
    });
    on("tool-manager.update", (e) => setTool(TOOL_NAMES[e.tool as string] ?? "select"));
    on("commandStack.elements.delete.postExecuted", () => {
      toast("Elemen dihapus", { action: { label: "Urungkan", onClick: () => get("commandStack").undo() } });
    });

    let active = true;
    load(initialXml ?? starterXml(name))
      .then(() => active && setDirty(!initialXml))
      .catch(() => active && setFailed(true))
      .finally(() => active && setReady(true));
    return () => {
      active = false;
      m.destroy();
      modeler.current = null;
    };
    // Editor dibuat sekali per halaman; diagram berikutnya dimuat lewat load().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useGSAP(
    () => {
      if (!success) return;
      const tl = gsap.timeline({ onComplete: () => setSuccess(false) });
      gsap.matchMedia().add(MOTION_OK, () => void tl.from(celebrate.current, { opacity: 0, scale: 0.9, duration: 0.35 }));
      tl.to(celebrate.current, { opacity: 0, duration: 0.4, delay: 2 });
    },
    { dependencies: [success] },
  );

  const chooseTool = (next: EditorTool) => {
    if (next === "select") get("dragging").cancel();
    else get("editorActions").trigger(TOOL_ACTIONS[next]);
    setTool(next);
  };

  const zoomBy = (step: 1 | -1 | 0) => (step ? get("editorActions").trigger("stepZoom", { value: step }) : get("canvas").zoom("fit-viewport", "auto"));

  const updateElement = (patch: Partial<Pick<SelectedElement, "name" | "documentation">>) => {
    const el = selected && get("elementRegistry").get(selected.id);
    if (!el) return;
    const props: Record<string, unknown> = {};
    if (patch.name !== undefined) props.name = patch.name;
    if (patch.documentation !== undefined) props.documentation = patch.documentation ? [get("moddle").create("bpmn:Documentation", { text: patch.documentation })] : [];
    get("modeling").updateProperties(el, props);
  };

  const save = async () => {
    if (!modeler.current) return;
    setSaving(true);
    try {
      const [{ xml }, { svg }] = await Promise.all([modeler.current.saveXML({ format: true }), modeler.current.saveSVG()]);
      const request = saveProbisDiagram(id, { xml: xml!, svg });
      toast.promise(request.then((r) => (r.ok ? r : Promise.reject(new Error(r.error)))), {
        loading: "Menyimpan diagram…",
        success: "Diagram tersimpan",
        error: (e: Error) => e.message,
      });
      const result = await request;
      if (result.ok) {
        setDirty(false);
        if (!saved) setSuccess(true);
        setSaved(true);
      }
    } finally {
      setSaving(false);
    }
  };

  const exportAs = async (format: "bpmn" | "svg" | "png") => {
    const m = modeler.current;
    if (!m) return;
    try {
      if (format === "bpmn") download(`${code}.bpmn`, (await m.saveXML({ format: true })).xml!, "application/xml");
      else {
        const { svg } = await m.saveSVG();
        if (format === "svg") download(`${code}.svg`, svg, "image/svg+xml");
        else download(`${code}.png`, await svgToPng(svg), "image/png");
      }
    } catch (error) {
      toast.error((error as Error).message || "Ekspor gagal.");
    }
  };

  const pickFile = async (file: File | undefined) => {
    if (fileInput.current) fileInput.current.value = "";
    if (!file) return;
    if (file.size > MAX_IMPORT) return toast.error("Berkas terlalu besar (maks. 2 MB).");
    const text = await file.text();
    if (!/<(\w+:)?definitions\b/.test(text) || /<!(DOCTYPE|ENTITY)/i.test(text)) return toast.error("Berkas bukan diagram BPMN 2.0 yang valid.");
    setPendingImport(text);
  };

  const confirmImport = async () => {
    const text = pendingImport;
    setPendingImport(null);
    if (!text || !modeler.current) return;
    const previous = (await modeler.current.saveXML({ format: true })).xml!;
    try {
      await load(text);
      setDirty(true);
      toast.success("Diagram diimpor", { description: "Simpan untuk menerapkan.", action: { label: "Urungkan", onClick: () => void load(previous) } });
    } catch {
      await load(previous);
      toast.error("Berkas tidak dapat dibaca sebagai diagram BPMN.");
    }
  };

  const restart = async () => {
    await load(starterXml(name));
    setDirty(true);
  };

  return (
    <div className="flex flex-col gap-4">
      <div data-aos="fade-blur">
        <DiagramStats stats={stats} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* Tanpa data-aos: filter/transform sisa animasi menjadikan kartu acuan `position: fixed`, menu ganti elemen bpmn-js jadi meleset. */}
        <Card className="bpmn-surface relative h-[70dvh] min-h-[460px] overflow-hidden bg-white p-0 text-brand-charcoal">
          <div ref={host} className="size-full" />
          {!ready && <Skeleton className="absolute inset-3" />}
          {failed && (
            <div className="absolute inset-0 grid place-items-center bg-white">
              <EmptyState illustration="error" title="Diagram tersimpan tidak dapat dibaca" description="Mulai ulang dari template atau impor berkas .bpmn.">
                <Button onClick={restart}>Mulai dari template</Button>
              </EmptyState>
            </div>
          )}
          {success && (
            <div ref={celebrate} className="pointer-events-none absolute inset-0 grid place-items-center bg-white/70">
              <Illustration name="success" loop={false} className="w-48" label="Diagram tersimpan" />
            </div>
          )}
          <div className="absolute inset-x-3 bottom-3 z-20 flex justify-center">
            <EditorDock
              tool={tool}
              onTool={chooseTool}
              zoom={zoom}
              onZoom={zoomBy}
              canUndo={history.undo}
              canRedo={history.redo}
              onUndo={() => get("commandStack").undo()}
              onRedo={() => get("commandStack").redo()}
              onImport={() => fileInput.current?.click()}
              onExport={exportAs}
              onSave={save}
              saving={saving}
              dirty={dirty}
              onPanel={() => setPanelOpen(true)}
            />
          </div>
        </Card>

        <Card data-aos="fade-blur" className="hidden p-0 lg:block">
          <ElementPanel element={selected} onChange={updateElement} />
        </Card>
      </div>

      <input ref={fileInput} type="file" accept=".bpmn,.xml,application/xml,text/xml" className="hidden" onChange={(e) => pickFile(e.target.files?.[0])} />

      <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
        <SheetContent className="lg:hidden">
          <SheetHeader>
            <SheetTitle>Properti elemen</SheetTitle>
          </SheetHeader>
          <ElementPanel element={selected} onChange={updateElement} />
        </SheetContent>
      </Sheet>

      <AlertDialog open={pendingImport !== null} onOpenChange={(open) => !open && setPendingImport(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ganti diagram dengan berkas ini?</AlertDialogTitle>
            <AlertDialogDescription>Diagram di kanvas diganti. Anda masih bisa mengurungkannya sebelum menyimpan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmImport}>Ganti</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
