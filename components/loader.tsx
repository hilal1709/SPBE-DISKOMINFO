import { Illustration } from "@/components/illustrations/illustration";
import { cn } from "@/lib/utils";

/** Lebar & warna lapisan gapura, sama dengan logo dan Lottie "loader" (scripts/lottie/build.mjs). */
const bars = [
  [24, "fill-brand-teal"],
  [39, "fill-brand-yellow"],
  [54, "fill-brand-amber"],
  [69, "fill-brand-orange"],
  [84, "fill-brand-sky"],
] as const;
/** Lebar pintu gapura yang membelah dua lapisan dasar. */
const DOOR = 12;

/**
 * Versi SVG + CSS dari animasi loader. Langsung bergerak dari HTML server, sebelum JavaScript
 * dan Lottie termuat — jadi layar loading tidak pernah hanya berisi teks.
 */
function LoaderBars() {
  return (
    <svg viewBox="0 0 120 120" className="absolute inset-0 size-full" aria-hidden>
      {bars.map(([w, fill], i) => {
        const half = (w - DOOR) / 2;
        const parts = i >= 3 ? [[60 - w / 2, half], [60 + DOOR / 2, half]] : [[60 - w / 2, w]];
        return parts.map(([x, width]) => (
          <rect
            key={`${i}-${x}`}
            x={x}
            y={25 + i * 15}
            width={width}
            height={10}
            rx={5}
            className={cn(fill, "loader-bar")}
            // Lapisan dasar tersusun lebih dulu, seperti pada Lottie.
            style={{ animationDelay: `${(bars.length - 1 - i) * 0.117}s` }}
          />
        ));
      })}
    </svg>
  );
}

/** Indikator pemuatan bermerek: lima lapisan arsitektur SPBE yang tersusun menjadi gapura. */
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
