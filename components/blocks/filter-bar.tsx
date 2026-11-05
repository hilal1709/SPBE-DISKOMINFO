"use client";
import { MultiSelect, type Option } from "@/components/blocks/multi-select";
import { FilterHorizontalIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useIsPhone } from "@/hooks/use-is-phone";
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

/** Jumlah filter yang sedang aktif (pilihan ganda terisi, atau pilihan tunggal opsional selain "Semua"). */
const activeCount = (filters: Filter[]) =>
  filters.filter((f) => (f.multiple ? !!f.values?.length : !f.required && f.value !== undefined && f.value !== ALL)).length;

/**
 * Baris filter dropdown di atas dashboard. Nilai `ALL` / daftar kosong berarti tanpa filter.
 * Di ponsel, daftar filter dilipat di balik tombol "Filter" (lembar bawah) agar tidak memenuhi layar (B8).
 */
export function FilterBar({ filters, actions, children, className }: { filters: Filter[]; actions?: React.ReactNode; /** Baris tambahan di bawah filter (mis. chip filter aktif). */ children?: React.ReactNode; className?: string }) {
  const phone = useIsPhone();
  const active = activeCount(filters);
  if (phone) {
    return (
      <Card className={cn("flex-row flex-wrap items-center gap-2 p-3", className)} data-reveal>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="mr-auto">
              <Icon icon={FilterHorizontalIcon} size={16} />
              Filter{active > 0 && <Badge variant="secondary" className="tabular-nums">{active}</Badge>}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85svh] overflow-y-auto p-4">
            <SheetHeader className="p-0">
              <SheetTitle>Filter</SheetTitle>
            </SheetHeader>
            <FilterFields filters={filters} className="grid gap-3" />
            <SheetClose asChild>
              <Button>Tampilkan hasil</Button>
            </SheetClose>
          </SheetContent>
        </Sheet>
        {actions}
        {children && <div className="basis-full empty:hidden">{children}</div>}
      </Card>
    );
  }
  return (
    <Card className={cn("flex-row flex-wrap items-center gap-3 p-3", className)} data-reveal>
      <FilterFields
        filters={filters}
        className="grid min-w-0 flex-1 basis-[40rem] gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-(--cols)"
        style={{ "--cols": filters.map((f) => `minmax(0, ${f.wide ? 1.6 : 1}fr)`).join(" ") } as React.CSSProperties}
      />
      {actions}
      {children && <div className="basis-full empty:hidden">{children}</div>}
    </Card>
  );
}

function FilterFields({ filters, className, style }: { filters: Filter[]; className: string; style?: React.CSSProperties }) {
  return (
    <div className={className} style={style}>
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
  );
}
