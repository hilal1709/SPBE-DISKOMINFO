import { cn } from "@/lib/utils";

/** Gradasi palet untuk heat map: biru muda → kuning → amber → oranye. */
const stops = ["var(--brand-sky)", "var(--brand-yellow)", "var(--brand-amber)", "var(--brand-orange)"];

export function heatColor(intensity: number) {
  const t = Math.min(Math.max(intensity, 0), 1) * (stops.length - 1);
  const i = Math.min(Math.floor(t), stops.length - 2);
  const local = Math.round((t - i) * 100);
  return `color-mix(in oklab, ${stops[i + 1]} ${local}%, ${stops[i]})`;
}

/** Petak heat map dengan intensitas 0–1. Teks charcoal kontras di seluruh gradasi. */
export function HeatTile({ label, value, intensity, className }: { label: string; value: string; intensity: number; className?: string }) {
  return (
    <div
      className={cn(
        "flex min-h-20 flex-col justify-between rounded-xl p-3 text-left text-brand-charcoal transition-transform duration-300 ease-(--ease-out) hover:-translate-y-0.5 hover:scale-[1.02]",
        className,
      )}
      style={{ background: heatColor(intensity) }}
    >
      <span className="text-[11px] leading-snug font-semibold">{label}</span>
      <span className="mt-2 text-lg font-bold tabular-nums">{value}</span>
    </div>
  );
}
