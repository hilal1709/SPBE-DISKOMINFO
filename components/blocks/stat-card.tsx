import { Sparkline } from "@/components/charts";
import { CountUp } from "@/components/motion/count-up";
import { SpotlightCard } from "@/components/motion/spotlight-card";
import { cn } from "@/lib/utils";

export type StatTone = "teal" | "orange" | "yellow" | "amber" | "sky" | "plain";

/** Blok warna solid seperti referensi; teks charcoal agar kontras AA di semua warna palet. */
const tones: Record<StatTone, string> = {
  teal: "bg-brand-teal ring-transparent",
  orange: "bg-brand-orange ring-transparent",
  yellow: "bg-brand-yellow ring-transparent",
  amber: "bg-brand-amber ring-transparent",
  sky: "bg-brand-sky ring-transparent",
  plain: "",
};

/** Kartu angka utama. Tanpa ikon — angka adalah fokusnya. */
export function StatCard({
  label,
  value,
  suffix,
  decimals,
  hint,
  tone = "plain",
  trend,
  footer,
  className,
}: {
  label: string;
  value: number;
  suffix?: string;
  decimals?: number;
  hint?: string;
  tone?: StatTone;
  /** Deret nilai untuk sparkline kecil di pojok kartu. */
  trend?: number[];
  /** Konten tambahan di bawah angka (mis. bar komposisi). */
  footer?: React.ReactNode;
  className?: string;
}) {
  const solid = tone !== "plain";
  return (
    <SpotlightCard
      className={cn("gap-1 px-5 py-5", tones[tone], solid && "text-on-brand", className)}
      style={solid ? ({ "--spot-color": "rgb(255 255 255 / 0.32)" } as React.CSSProperties) : undefined}
      data-reveal
    >
      <p className={cn("text-sm font-semibold", !solid && "text-muted-foreground")}>{label}</p>
      <p className="mt-1 text-4xl font-bold tracking-tight">
        <CountUp value={value} suffix={suffix} decimals={decimals} />
      </p>
      {hint && <p className={cn("text-xs", solid ? "font-medium" : "text-muted-foreground")}>{hint}</p>}
      {footer}
      {trend && (
        <div className="pointer-events-none absolute right-4 bottom-4 h-10 w-24 opacity-90">
          <Sparkline data={trend} color={solid ? "rgba(45,45,47,0.75)" : undefined} />
        </div>
      )}
    </SpotlightCard>
  );
}

/** Urutan warna kartu statistik sesuai referensi: teal, oranye, kuning, amber. */
export const statTones: StatTone[] = ["teal", "orange", "yellow", "amber"];
