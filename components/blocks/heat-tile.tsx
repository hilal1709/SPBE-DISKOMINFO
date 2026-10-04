import { cn } from "@/lib/utils";

/**
 * Petak heat map: intensitas 0–1 dipetakan ke gradasi amber.
 * Petak dengan intensitas tinggi otomatis memakai teks gelap yang kontras.
 */
export function HeatTile({ label, value, intensity, className }: { label: string; value: string; intensity: number; className?: string }) {
  const mix = Math.round(18 + intensity * 82);
  return (
    <div
      className={cn(
        "group flex min-h-20 flex-col justify-between rounded-lg p-3 text-left transition-transform duration-300 ease-(--ease-out) hover:-translate-y-0.5 hover:scale-[1.02]",
        className,
      )}
      style={{ background: `color-mix(in oklab, var(--primary) ${mix}%, var(--card))` }}
    >
      <span className="text-[11px] leading-snug font-semibold text-foreground/85">{label}</span>
      <span className="mt-2 text-lg font-bold tabular-nums">{value}</span>
    </div>
  );
}
