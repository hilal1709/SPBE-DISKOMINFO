"use client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Dialog detail entri katalog dengan header & footer sticky (pola @efferd di 21st.dev).
 * Isi dengan <DetailField/> atau <DetailSection/>.
 */
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
      <DialogContent className="max-h-[88svh] gap-0 overflow-y-auto p-0 sm:max-w-2xl">
        <DialogHeader className="sticky top-0 z-10 border-b bg-popover/90 px-6 py-5 pr-16 text-left backdrop-blur-md">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : <DialogDescription className="sr-only">Detail {title}</DialogDescription>}
          {meta && <div className="mt-1 flex flex-wrap gap-2">{meta}</div>}
        </DialogHeader>
        <div className="grid gap-4 px-6 py-5">{children}</div>
        <DialogFooter className="sticky bottom-0 mx-0 mb-0">
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
    <div className={cn("rounded-xl bg-muted/70 p-3", className)}>
      <p className="eyebrow">{label}</p>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}

export function DetailSection({ title, children, tone = "default" }: { title: string; children: React.ReactNode; tone?: "default" | "accent" }) {
  return (
    <section className={cn("rounded-xl border p-4", tone === "accent" && "border-brand-sky bg-accent")}>
      <p className="mb-3 text-[11px] font-semibold tracking-wide text-link uppercase">{title}</p>
      {children}
    </section>
  );
}
