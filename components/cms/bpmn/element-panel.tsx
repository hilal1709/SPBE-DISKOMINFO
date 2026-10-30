"use client";
import { useRef } from "react";
import { MOTION_OK, gsap, useGSAP } from "@/components/motion/gsap";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { typeLabel } from "./diagram-model";

export type SelectedElement = { id: string; type: string; name: string; documentation: string };

/** Properti elemen terpilih: nama dan dokumentasi. Masuk dengan slide halus saat pilihan berubah. */
export function ElementPanel({ element, readOnly, onChange }: { element: SelectedElement | null; readOnly?: boolean; onChange: (patch: Partial<Pick<SelectedElement, "name" | "documentation">>) => void }) {
  const panel = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!element) return;
      gsap.matchMedia().add(MOTION_OK, () => {
        gsap.from("[data-field]", { x: 16, opacity: 0, stagger: 0.05, duration: 0.35 });
      });
    },
    { dependencies: [element?.id], scope: panel },
  );

  if (!element) return <p className="p-4 text-sm text-muted-foreground">Pilih elemen pada kanvas untuk mengubah nama dan dokumentasinya.</p>;
  const named = element.type !== "bpmn:Process";

  return (
    <div ref={panel} className="flex flex-col gap-4 p-4">
      <div data-field className="flex items-center gap-2">
        <Badge variant="secondary">{typeLabel(element.type)}</Badge>
        <code className="truncate text-xs text-muted-foreground">{element.id}</code>
      </div>
      {named && (
        <div data-field className="grid gap-1.5">
          <Label htmlFor="bpmn-name">Nama</Label>
          <Input id="bpmn-name" value={element.name} readOnly={readOnly} maxLength={200} onChange={(e) => onChange({ name: e.target.value })} />
        </div>
      )}
      <div data-field className="grid gap-1.5">
        <Label htmlFor="bpmn-doc">Dokumentasi</Label>
        <p id="bpmn-doc-hint" className="text-xs text-muted-foreground">Pelaksana, dokumen, waktu layanan, atau dasar hukum. Tampil saat elemen disorot dan di daftar keterangan di bawah diagram.</p>
        <Textarea id="bpmn-doc" aria-describedby="bpmn-doc-hint" rows={6} value={element.documentation} readOnly={readOnly} maxLength={2000} onChange={(e) => onChange({ documentation: e.target.value })} />
      </div>
    </div>
  );
}
