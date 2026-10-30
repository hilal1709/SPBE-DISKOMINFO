"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { WorkflowSquare10Icon } from "@hugeicons/core-free-icons";
import { getProbisDiagram } from "@/app/cms/actions";
import { DetailSection } from "@/components/blocks/detail-dialog";
import { EmptyState } from "@/components/blocks/empty-state";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Pratinjau diagram di pop-up detail probis CMS. SVG tersimpan ditampilkan lewat <img> (data URI), jadi
 * isinya tidak pernah dieksekusi sebagai DOM halaman.
 */
export function DiagramPreview({ id, hasDiagram, editable }: { id: string; hasDiagram: boolean; editable: boolean }) {
  const [svg, setSvg] = useState<string | null | undefined>(hasDiagram ? undefined : null);
  const href = `/cms/proses-bisnis/${id}/diagram`;

  useEffect(() => {
    if (!hasDiagram) return;
    let active = true;
    getProbisDiagram(id).then((r) => active && setSvg(r.ok ? r.data.svg : null));
    return () => {
      active = false;
    };
  }, [id, hasDiagram]);

  return (
    <DetailSection title="Diagram proses">
      {svg === undefined ? (
        <Skeleton className="h-40 w-full" />
      ) : svg ? (
        <div className="flex flex-col gap-3">
          <Link href={href} className="block overflow-hidden rounded-lg border bg-white p-2 transition-shadow hover:shadow-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} alt="Pratinjau diagram BPMN" className="mx-auto max-h-56 w-auto" />
          </Link>
          <Button asChild variant="outline" size="sm" className="self-start">
            <Link href={href}>
              <Icon icon={WorkflowSquare10Icon} size={16} />
              {editable ? "Ubah diagram" : "Lihat diagram"}
            </Link>
          </Button>
        </div>
      ) : (
        <EmptyState size="sm" title="Belum ada diagram" description={editable ? "Gambarkan alur proses bisnis ini dengan notasi BPMN." : undefined}>
          {editable && (
            <Button asChild size="sm">
              <Link href={href}>Mulai dari template</Link>
            </Button>
          )}
        </EmptyState>
      )}
    </DetailSection>
  );
}
