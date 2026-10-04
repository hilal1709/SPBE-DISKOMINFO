import { Illustration } from "@/components/illustrations/illustration";
import { cn } from "@/lib/utils";

/** Lebar & warna lapisan, sama dengan Lottie "loader" (scripts/lottie/build.mjs). */
const bars = [
  [56, "fill-brand-teal"],
  [40, "fill-brand-yellow"],
  [64, "fill-brand-amber"],
  [80, "fill-brand-orange"],
  [64, "fill-brand-sky"],
] as const;

/**
 * Versi SVG + CSS dari animasi loader. Langsung bergerak dari HTML server, sebelum JavaScript
 * dan Lottie termuat — jadi layar loading tidak pernah hanya berisi teks.
 */
function LoaderBars() {
  return (
    <svg viewBox="0 0 120 120" className="absolute inset-0 size-full" aria-hidden>
      {bars.map(([w, fill], i) => (
        <rect
          key={i}
          x={60 - w / 2}
          y={25 + i * 15}
          width={w}
          height={10}
          rx={5}
          className={cn(fill, "loader-bar")}
          // Lapisan bawah tersusun lebih dulu, seperti pada Lottie.
          style={{ animationDelay: `${(bars.length - 1 - i) * 0.117}s` }}
        />
      ))}
    </svg>
  );
}

/** Indikator pemuatan bermerek: lima lapisan arsitektur SPBE yang tersusun. */
export function Loader({ label = "Memuat data", className }: { label?: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={cn("flex flex-col items-center gap-2", className)}>
      <Illustration name="loader" className="size-20" fallback={<LoaderBars />} />
      <p className="text-sm font-medium text-muted-foreground">
        {label}
        <span className="inline-flex w-4 animate-pulse">…</span>
      </p>
    </div>
  );
}
