"use client";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

/** Pilihan tunggal berbentuk pil; pil aktif kuning seperti referensi (shadcn ToggleGroup), mis. status probis Baru / Upgrade / AS-IS. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  label: string;
  className?: string;
}) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      // Tidak boleh kosong: abaikan klik pada segmen yang sedang aktif.
      onValueChange={(v) => v && onChange(v as T)}
      aria-label={label}
      spacing={1.5}
      className={cn("grid w-full auto-cols-fr grid-flow-col", className)}
    >
      {options.map((o) => (
        <ToggleGroupItem
          key={o.value}
          value={o.value}
          className="h-8 rounded-full border border-border px-3.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:border-brand-charcoal/30 hover:bg-transparent hover:text-foreground data-[state=on]:border-transparent data-[state=on]:bg-brand-yellow data-[state=on]:font-semibold data-[state=on]:text-on-brand"
        >
          {o.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
