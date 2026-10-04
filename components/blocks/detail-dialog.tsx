"use client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** Dialog detail entri katalog. Isi dengan <DetailField/> atau <DetailSection/>. */
export function DetailDialog({
  open,
  onOpenChange,
  eyebrow,
  title,
  description,
  meta,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eyebrow?: string;
  title: string;
  description?: string;
  meta?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] gap-0 overflow-y-auto p-0 sm:max-w-2xl">
        <DialogHeader className="border-b px-6 py-5 text-left">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <DialogTitle className="text-lg font-bold">{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
          {meta && <div className="mt-2 flex flex-wrap gap-2">{meta}</div>}
        </DialogHeader>
        <div className="grid gap-4 px-6 py-5">{children}</div>
        <DialogFooter className="mx-0 mb-0 border-t px-6 py-4">
          <p className="mr-auto self-center text-xs text-muted-foreground">Katalog Arsitektur SPBE · Pemerintah Kabupaten Gresik</p>
          <DialogClose asChild>
            <Button>Tutup</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DetailField({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-lg bg-muted/60 p-3", className)}>
      <p className="eyebrow">{label}</p>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}

export function DetailSection({ title, children, tone = "default" }: { title: string; children: React.ReactNode; tone?: "default" | "accent" }) {
  return (
    <section className={cn("rounded-xl border p-4", tone === "accent" && "border-primary/30 bg-accent/50")}>
      <p className="mb-3 text-[11px] font-semibold tracking-wide text-secondary-foreground uppercase">{title}</p>
      {children}
    </section>
  );
}
