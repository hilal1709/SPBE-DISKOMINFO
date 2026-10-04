"use client";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

/** Pilihan tunggal berbentuk segmen (shadcn ToggleGroup), mis. status probis Baru / Upgrade / AS-IS. */
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
      className={cn("grid w-full auto-cols-fr grid-flow-col gap-1 rounded-lg bg-muted p-1", className)}
    >
      {options.map((o) => (
        <ToggleGroupItem
          key={o.value}
          value={o.value}
          className="h-8 rounded-md text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-transparent hover:text-foreground data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-card"
        >
          {o.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
