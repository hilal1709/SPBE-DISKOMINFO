"use client";
import { MultiSelect, type Option } from "@/components/blocks/multi-select";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type Filter = {
  label: string;
  options?: (string | Option)[];
  value?: string;
  onChange?: (value: string) => void;
  /** Pilihan ganda (dropdown berceklis). */
  multiple?: boolean;
  searchable?: boolean;
  values?: string[];
  onValuesChange?: (values: string[]) => void;
  /** Kolom lebih lebar untuk label/pilihan panjang. */
  wide?: boolean;
  /** Sembunyikan opsi "Semua" (single-select wajib memilih satu). */
  required?: boolean;
};

export const ALL = "__all";

const toOption = (option: string | Option): Option => (typeof option === "string" ? { value: option, label: option } : option);

/** Baris filter dropdown di atas dashboard. Nilai `ALL` / daftar kosong berarti tanpa filter. */
export function FilterBar({ filters, actions, children, className }: { filters: Filter[]; actions?: React.ReactNode; /** Baris tambahan di bawah filter (mis. chip filter aktif). */ children?: React.ReactNode; className?: string }) {
  return (
    <Card className={cn("flex-row flex-wrap items-center gap-3 p-3", className)} data-reveal>
      <div className="grid min-w-0 flex-1 basis-[40rem] gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-(--cols)" style={{ "--cols": filters.map((f) => `minmax(0, ${f.wide ? 1.6 : 1}fr)`).join(" ") } as React.CSSProperties}>
        {filters.map((filter) => {
          const options = filter.options?.map(toOption) ?? [];
          return (
            <div key={filter.label} className="flex min-w-0 items-center gap-3 rounded-lg bg-muted/60 py-1 pr-1 pl-3">
              <span className="shrink-0 text-xs font-medium text-muted-foreground">{filter.label}</span>
              {filter.multiple ? (
                <MultiSelect label={filter.label} options={options} values={filter.values ?? []} onValuesChange={(v) => filter.onValuesChange?.(v)} searchable={filter.searchable} />
              ) : (
                <Select value={filter.value} defaultValue={filter.value === undefined ? ALL : undefined} onValueChange={filter.onChange}>
                  <SelectTrigger className="ml-auto h-8 min-w-0 flex-1 border-0 bg-card shadow-card" aria-label={filter.label}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {!filter.required && <SelectItem value={ALL}>Semua</SelectItem>}
                    {options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          );
        })}
      </div>
      {actions}
      {children && <div className="basis-full empty:hidden">{children}</div>}
    </Card>
  );
}
