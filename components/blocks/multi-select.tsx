"use client";
import { useState } from "react";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type Option = { value: string; label: string };

/** Dropdown pilihan ganda dengan pencarian opsional. Kosong berarti "Semua". */
export function MultiSelect({
  options,
  values,
  onValuesChange,
  label,
  searchable,
  className,
}: {
  options: Option[];
  values: string[];
  onValuesChange: (values: string[]) => void;
  label: string;
  searchable?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const toggle = (value: string) => onValuesChange(values.includes(value) ? values.filter((v) => v !== value) : [...values, value]);
  const summary = !values.length ? "Semua" : values.length === 1 ? (options.find((o) => o.value === values[0])?.label ?? values[0]) : `${values.length} dipilih`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={label}
          className={cn("group/ms h-8 min-w-0 flex-1 justify-between gap-2 border-0 bg-card px-3 font-normal shadow-card transition-colors", values.length > 0 && "bg-accent text-accent-foreground", className)}
        >
          <span className={cn("truncate", values.length > 0 && "font-medium")}>{summary}</span>
          <Icon icon={ArrowDown01Icon} size={16} className="shrink-0 text-muted-foreground transition-transform duration-300 ease-(--ease-out) group-data-[state=open]/ms:rotate-180" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) min-w-72 p-0">
        <Command>
          {searchable && <CommandInput placeholder={`Cari ${label.toLowerCase()}`} />}
          <CommandList>
            <CommandEmpty>Tidak ditemukan.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem key={option.value} value={option.label} data-checked={values.includes(option.value)} onSelect={() => toggle(option.value)}>
                  <span className="line-clamp-2">{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          <div className="flex justify-between gap-2 border-t p-1.5">
            <Button variant="ghost" size="sm" onClick={() => onValuesChange(options.map((o) => o.value))}>Pilih semua</Button>
            <Button variant="ghost" size="sm" disabled={!values.length} onClick={() => onValuesChange([])}>Hapus</Button>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
