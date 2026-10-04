import { CountUp } from "@/components/motion/count-up";
import { SpotlightCard } from "@/components/motion/spotlight-card";
import { cn } from "@/lib/utils";

/** Kartu angka utama. Tanpa ikon — angka adalah fokusnya. */
export function StatCard({
  label,
  value,
  suffix,
  decimals,
  hint,
  highlight = false,
  className,
}: {
  label: string;
  value: number;
  suffix?: string;
  decimals?: number;
  hint?: string;
  highlight?: boolean;
  className?: string;
}) {
  return (
    <SpotlightCard className={cn("gap-1 px-5 py-5", highlight && "bg-accent ring-primary/30", className)} data-reveal>
      <p className="eyebrow">{label}</p>
      <p className="text-3xl font-bold tracking-tight">
        <CountUp value={value} suffix={suffix} decimals={decimals} />
      </p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </SpotlightCard>
  );
}
