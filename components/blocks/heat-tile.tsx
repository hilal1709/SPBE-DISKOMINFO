import { cn } from "@/lib/utils";

/** Gradasi palet untuk heat map: biru muda → kuning → amber → oranye. */
const stops = ["var(--brand-sky)", "var(--brand-yellow)", "var(--brand-amber)", "var(--brand-orange)"];

export function heatColor(intensity: number) {
  const t = Math.min(Math.max(intensity, 0), 1) * (stops.length - 1);
  const i = Math.min(Math.floor(t), stops.length - 2);
  const local = Math.round((t - i) * 100);
  return `color-mix(in oklab, ${stops[i + 1]} ${local}%, ${stops[i]})`;
}

/**
 * Petak heat map dengan intensitas 0–1. Teks charcoal kontras di seluruh gradasi.
 * Dengan `onClick` petak menjadi tombol filter (bentogrid click-to-filter); `active` menandai pilihan.
 */
export function HeatTile({
  label,
  eyebrow,
  value,
  intensity,
  className,
  style,
  onClick,
  active,
  dimmed,
}: {
  label: string;
  /** Teks kecil di atas label (mis. kode RAB). */
  eyebrow?: string;
  value: string;
  intensity: number;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  active?: boolean;
  /** Redup saat ada pilihan lain yang aktif. */
  dimmed?: boolean;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      aria-pressed={onClick ? !!active : undefined}
      className={cn(
        "flex min-h-20 min-w-0 flex-col justify-between overflow-hidden rounded-xl p-3 text-left text-brand-charcoal transition-[transform,opacity,box-shadow] duration-300 ease-(--ease-out) hover:-translate-y-0.5 hover:scale-[1.02]",
        onClick && "cursor-pointer focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none",
        active && "ring-3 ring-brand-charcoal",
        dimmed && "opacity-45 hover:opacity-100",
        className,
      )}
      style={{ background: heatColor(intensity), ...style }}
      title={eyebrow ? `${eyebrow} ${label}` : label}
    >
      <span className="min-w-0">
        {eyebrow && <span className="block text-[10px] font-medium tabular-nums opacity-75">{eyebrow}</span>}
        <span className="line-clamp-2 text-[11px] leading-snug font-semibold">{label}</span>
      </span>
      <span className="mt-2 text-lg font-bold tabular-nums">{value}</span>
    </Comp>
  );
}
