import { Illustration } from "@/components/illustrations/illustration";
import { cn } from "@/lib/utils";

/** Indikator pemuatan bermerek: lima lapisan arsitektur SPBE yang tersusun. */
export function Loader({ label = "Memuat data", className }: { label?: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={cn("flex flex-col items-center gap-2", className)}>
      <Illustration name="loader" className="size-20" />
      <p className="text-sm font-medium text-muted-foreground">
        {label}
        <span className="inline-flex w-4 animate-pulse">…</span>
      </p>
    </div>
  );
}
