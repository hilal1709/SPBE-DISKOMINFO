"use client";
import { useState } from "react";
import { ArrowDown01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type LinkOption = { code: string; name: string; /** Teks kecil di kanan, mis. OPD pemilik. */ hint?: string };

/** Pilih beberapa entri domain lain (cari kode/nama) dan tampilkan sebagai chip yang bisa dilepas. Dipakai tautan probis & layanan. */
export function LinkPicker({
  options,
  values,
  loading,
  disabled,
  onChange,
  noun,
  disabledText,
}: {
  options: LinkOption[];
  values: string[];
  loading: boolean;
  disabled: boolean;
  onChange: (values: string[]) => void;
  /** "proses bisnis" / "layanan". */
  noun: string;
  /** Teks tombol saat nonaktif. */
  disabledText: string;
}) {
  const [open, setOpen] = useState(false);
  const name = (code: string) => options.find((o) => o.code === code)?.name;
  const toggle = (code: string) => onChange(values.includes(code) ? values.filter((v) => v !== code) : [...values, code]);
  return (
    <div className="grid gap-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" role="combobox" aria-expanded={open} disabled={disabled} className="group/pb h-auto min-h-10 w-full justify-between gap-2 py-2 font-normal">
            <span className="text-muted-foreground">{disabled ? disabledText : loading ? `Memuat ${noun}…` : options.length ? `Cari dan pilih ${noun}` : `Belum ada ${noun} untuk pilihan ini`}</span>
            <Icon icon={ArrowDown01Icon} size={16} className="shrink-0 text-muted-foreground transition-transform duration-300 group-data-[state=open]/pb:rotate-180" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-(--radix-popover-trigger-width) min-w-80 p-0">
          <Command>
            <CommandInput placeholder={`Cari kode atau nama ${noun}…`} />
            <CommandList className="max-h-80">
              <CommandEmpty>Tidak ditemukan.</CommandEmpty>
              <CommandGroup>
                {options.map((o) => (
                  <CommandItem key={o.code} value={`${o.code} ${o.name} ${o.hint ?? ""}`} data-checked={values.includes(o.code)} onSelect={() => toggle(o.code)}>
                    <span className="w-32 shrink-0 text-xs text-muted-foreground tabular-nums">{o.code}</span>
                    <span className="line-clamp-2 flex-1">{o.name}</span>
                    {o.hint && <span className="shrink-0 text-[11px] text-muted-foreground">{o.hint}</span>}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {values.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {values.map((code) => (
            <li key={code} className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-brand-teal/15 py-1 pr-1 pl-3 text-xs">
              <span className="text-muted-foreground tabular-nums">{code}</span>
              <span className="truncate font-medium">{name(code) ?? ""}</span>
              <Button type="button" variant="ghost" size="icon-xs" aria-label={`Lepas ${code}`} onClick={() => toggle(code)} className="size-5 rounded-full">
                <Icon icon={Cancel01Icon} size={11} />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
