"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { Banner } from "@/components/blocks/banner";
import { EmptyState } from "@/components/blocks/empty-state";
import { StatusBadge } from "@/components/blocks/status-badge";
import { Icon } from "@/components/icon";
import { WordStagger } from "@/components/motion/word-stagger";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { SubmissionStatus } from "@/lib/types";

// bpmn-js butuh `window`: editor & viewer hanya dirender di browser.
const BpmnEditor = dynamic(() => import("./bpmn-editor"), { ssr: false, loading: () => <Skeleton className="h-[70dvh] min-h-[460px] w-full rounded-xl" /> });
const BpmnViewer = dynamic(() => import("./bpmn-viewer").then((m) => m.BpmnViewer), { ssr: false, loading: () => <Skeleton className="h-[70dvh] min-h-[460px] w-full rounded-xl" /> });

const BACK = "/cms/proses-bisnis";

type Props = { id: string; code: string; name: string; status: SubmissionStatus; xml: string | null; editable: boolean };

/** Halaman diagram probis: editor bila rekaman boleh disunting, selain itu viewer hanya-baca. */
export function DiagramWorkspace({ id, code, name, status, xml, editable }: Props) {
  const router = useRouter();
  const [dirty, setDirty] = useState(false);
  const [leaving, setLeaving] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div data-aos="fade-blur" className="flex flex-wrap items-center gap-3">
        {dirty ? (
          <Button variant="ghost" size="icon" aria-label="Kembali ke daftar probis" onClick={() => setLeaving(true)}>
            <Icon icon={ArrowLeft01Icon} />
          </Button>
        ) : (
          <Button variant="ghost" size="icon" aria-label="Kembali ke daftar probis" asChild>
            <Link href={BACK}>
              <Icon icon={ArrowLeft01Icon} />
            </Link>
          </Button>
        )}
        <div className="min-w-0">
          <p className="eyebrow">{code}</p>
          <WordStagger as="h2" text={name} className="text-xl font-bold tracking-tight text-balance" />
        </div>
        <div className="ml-auto">
          <StatusBadge status={status} />
        </div>
      </div>

      {editable ? (
        <BpmnEditor id={id} code={code} name={name} initialXml={xml} onDirty={setDirty} />
      ) : (
        <>
          <Banner variant="warning" label="Terkunci" dismissible={false}>
            Diagram hanya dapat diubah saat probis berstatus draf atau dikembalikan.
          </Banner>
          {xml ? (
            <div data-aos="fade-blur">
              <BpmnViewer xml={xml} className="h-[70dvh] min-h-[460px]" />
            </div>
          ) : (
            <EmptyState title="Belum ada diagram" description="Pemilik probis belum menggambar alur proses bisnis ini." />
          )}
        </>
      )}

      <AlertDialog open={leaving} onOpenChange={setLeaving}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tinggalkan tanpa menyimpan?</AlertDialogTitle>
            <AlertDialogDescription>Perubahan diagram yang belum disimpan akan hilang.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Tetap di sini</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => router.push(BACK)}>
              Tinggalkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
