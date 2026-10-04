"use client";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type Filter = { label: string; options?: string[]; value?: string; onChange?: (value: string) => void };

export const ALL = "__all";

/** Baris filter dropdown di atas dashboard. Nilai `ALL` berarti tanpa filter. */
export function FilterBar({ filters, className }: { filters: Filter[]; className?: string }) {
  return (
    <Card className={cn("grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-(--cols)", className)} style={{ "--cols": `repeat(${filters.length}, minmax(0, 1fr))` } as React.CSSProperties} data-reveal>
      {filters.map((filter) => (
        <label key={filter.label} className="flex min-w-0 items-center gap-3 rounded-lg bg-muted/60 py-1 pr-1 pl-3">
          <span className="shrink-0 text-xs font-medium text-muted-foreground">{filter.label}</span>
          <Select value={filter.value} defaultValue={filter.value === undefined ? ALL : undefined} onValueChange={filter.onChange}>
            <SelectTrigger className="ml-auto h-8 min-w-0 flex-1 border-0 bg-card shadow-card" aria-label={filter.label}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Semua</SelectItem>
              {filter.options?.map((option) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      ))}
    </Card>
  );
}
