"use client";
import { useRef } from "react";
import {
  Cursor01Icon,
  Download04Icon,
  FitToScreenIcon,
  FloppyDiskIcon,
  Hold01Icon,
  LassoTool01Icon,
  MinusSignIcon,
  PlusSignIcon,
  Redo02Icon,
  Route01Icon,
  SidebarRightIcon,
  Undo02Icon,
  Upload04Icon,
} from "@hugeicons/core-free-icons";
import { Icon, type IconSvgElement } from "@/components/icon";
import { MOTION_OK, gsap, useGSAP } from "@/components/motion/gsap";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type EditorTool = "select" | "hand" | "lasso" | "connect";

const tools: { value: EditorTool; label: string; icon: IconSvgElement }[] = [
  { value: "select", label: "Pilih", icon: Cursor01Icon },
  { value: "hand", label: "Geser kanvas", icon: Hold01Icon },
  { value: "lasso", label: "Pilih area", icon: LassoTool01Icon },
  { value: "connect", label: "Sambungkan", icon: Route01Icon },
];

type Props = {
  tool: EditorTool;
  onTool: (tool: EditorTool) => void;
  zoom: number;
  onZoom: (step: 1 | -1 | 0) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onImport: () => void;
  onExport: (format: "bpmn" | "svg" | "png") => void;
  onSave: () => void;
  saving: boolean;
  dirty: boolean;
  /** Tombol panel properti (layar sempit). */
  onPanel?: () => void;
};

/**
 * Dock alat mengambang di bawah kanvas (pola "Toolbar Dock" & "Canvas Zoom Toolbar" 21st.dev):
 * satu sorotan yang meluncur ke tombol yang disorot, persentase zoom ber-tween, dan titik "belum disimpan" berdenyut.
 */
export function EditorDock(props: Props) {
  const { tool, onTool, zoom, onZoom, canUndo, canRedo, onUndo, onRedo, onImport, onExport, onSave, saving, dirty, onPanel } = props;
  const dock = useRef<HTMLDivElement>(null);
  const glow = useRef<HTMLSpanElement>(null);
  const percent = useRef<HTMLSpanElement>(null);
  const shown = useRef({ value: zoom });

  useGSAP(
    () => {
      gsap.matchMedia().add(MOTION_OK, () => {
        gsap.from(dock.current, { y: 28, opacity: 0, duration: 0.6, ease: "back.out(1.6)" });
      });
    },
    { scope: dock },
  );

  useGSAP(
    () => {
      const write = () => percent.current && (percent.current.textContent = `${Math.round(shown.current.value * 100)}%`);
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => void gsap.to(shown.current, { value: zoom, duration: 0.35, ease: "power2.out", onUpdate: write }));
      mm.add("(prefers-reduced-motion: reduce)", () => {
        shown.current.value = zoom;
        write();
      });
    },
    { dependencies: [zoom] },
  );

  useGSAP(
    () => {
      if (!dirty) return;
      gsap.matchMedia().add(MOTION_OK, () => {
        gsap.to("[data-dirty-dot]", { scale: 1.6, opacity: 0.4, duration: 0.8, repeat: -1, yoyo: true, ease: "sine.inOut" });
      });
    },
    { dependencies: [dirty], scope: dock, revertOnUpdate: true },
  );

  // Sorotan meluncur ke tombol yang sedang disorot/fokus.
  const follow = (event: React.PointerEvent | React.FocusEvent) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>("button");
    if (!target || !dock.current || !glow.current) return;
    const box = dock.current.getBoundingClientRect();
    const r = target.getBoundingClientRect();
    const to = { x: r.left - box.left, width: r.width, opacity: 1 };
    if (window.matchMedia(MOTION_OK).matches) gsap.to(glow.current, { ...to, duration: 0.25, ease: "power3.out" });
    else gsap.set(glow.current, to);
  };
  const hide = () => glow.current && gsap.to(glow.current, { opacity: 0, duration: 0.2 });

  return (
    <div
      ref={dock}
      onPointerOver={follow}
      onFocus={follow}
      onPointerLeave={hide}
      role="toolbar"
      aria-label="Alat diagram"
      className="relative mx-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl border bg-background/95 p-1.5 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <span ref={glow} aria-hidden className="pointer-events-none absolute top-1.5 left-0 h-9 rounded-lg bg-brand-sky/50 opacity-0" />

      <ToggleGroup type="single" value={tool} onValueChange={(v) => v && onTool(v as EditorTool)} className="relative" aria-label="Mode">
        {tools.map((t) => (
          <Tooltip key={t.value}>
            <TooltipTrigger asChild>
              <ToggleGroupItem value={t.value} aria-label={t.label} className="data-[state=on]:bg-brand-teal/20">
                <Icon icon={t.icon} />
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent side="top">{t.label}</TooltipContent>
          </Tooltip>
        ))}
      </ToggleGroup>

      <Separator orientation="vertical" className="mx-1 h-6" />
      <DockButton label="Urungkan (Ctrl+Z)" icon={Undo02Icon} onClick={onUndo} disabled={!canUndo} />
      <DockButton label="Ulangi (Ctrl+Y)" icon={Redo02Icon} onClick={onRedo} disabled={!canRedo} />

      <Separator orientation="vertical" className="mx-1 h-6" />
      <DockButton label="Perkecil" icon={MinusSignIcon} onClick={() => onZoom(-1)} />
      <span ref={percent} className="relative w-12 text-center text-xs font-medium tabular-nums" aria-live="polite">
        {Math.round(zoom * 100)}%
      </span>
      <DockButton label="Perbesar" icon={PlusSignIcon} onClick={() => onZoom(1)} />
      <DockButton label="Muat seluruh diagram" icon={FitToScreenIcon} onClick={() => onZoom(0)} />

      <Separator orientation="vertical" className="mx-1 h-6" />
      <DockButton label="Impor berkas .bpmn" icon={Upload04Icon} onClick={onImport} />
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Ekspor" className="relative">
                <Icon icon={Download04Icon} />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="top">Ekspor</TooltipContent>
        </Tooltip>
        <DropdownMenuContent side="top" align="center">
          <DropdownMenuItem onSelect={() => onExport("bpmn")}>BPMN 2.0 (.bpmn)</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onExport("svg")}>Gambar vektor (.svg)</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onExport("png")}>Gambar (.png)</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {onPanel && <DockButton label="Properti elemen" icon={SidebarRightIcon} onClick={onPanel} className="lg:hidden" />}

      <Separator orientation="vertical" className="mx-1 h-6" />
      <Button onClick={onSave} loading={saving} disabled={!dirty && !saving} className="relative">
        {!saving && <Icon icon={FloppyDiskIcon} data-icon="inline-start" />}
        Simpan
        {dirty && <span data-dirty-dot aria-label="Ada perubahan belum disimpan" className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-brand-amber" />}
      </Button>
    </div>
  );
}

function DockButton({ label, icon, onClick, disabled, className }: { label: string; icon: IconSvgElement; onClick: () => void; disabled?: boolean; className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={label} onClick={onClick} disabled={disabled} className={cn("relative", className)}>
          <Icon icon={icon} />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}
