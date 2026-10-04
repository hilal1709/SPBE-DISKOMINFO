"use client";
import { useRef, useState } from "react";
import { ArrowDown01Icon, ArrowRight01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/icon";
import { MOTION_OK, gsap, useGSAP } from "@/components/motion/gsap";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { RabIndex, RabNode } from "@/lib/probis/rab-index";
import { cn } from "@/lib/utils";

const ALL = "__all";

/** Teks pemilih per referensi, mis. RAB: sektor / urusan / sub-urusan. */
export type RefLabels = { ref: string; l1: string; l2: string; l3: string };

/**
 * Pemilih referensi berjenjang (RAB/RAL). Cukup pilih Level 3 — Level 1 dan 2 terisi otomatis
 * karena kodenya hierarkis. Level 1/2 juga bisa dipilih dulu untuk mempersempit daftar.
 */
export function RefPicker({
  index: rab,
  labels: t,
  value,
  onChange,
  invalid,
  id,
}: {
  /** Indeks referensi versi milik periode isian. */
  index: RabIndex;
  labels: RefLabels;
  value: string | null;
  onChange: (code: string | null) => void;
  invalid?: boolean;
  id?: string;
}) {
  const chain = rab.chain(value);
  // Isian baru hanya dari referensi yang masih berlaku.
  const level1 = rab.level(1, true);
  const childrenOf = (code: string) => rab.children(code, true);
  const [l1, setL1] = useState<string | null>(chain.l1?.code ?? null);
  const [l2, setL2] = useState<string | null>(chain.l2?.code ?? null);
  const [open, setOpen] = useState(false);
  const crumbs = useRef<HTMLDivElement>(null);

  // Nilai dari luar (mis. saran AI) ikut menyetel L1/L2.
  const [synced, setSynced] = useState(value);
  if (value !== synced) {
    setSynced(value);
    if (chain.l1) setL1(chain.l1.code);
    if (chain.l2) setL2(chain.l2.code);
  }

  useGSAP(
    () => {
      if (!value) return;
      gsap.matchMedia().add(MOTION_OK, () => {
        gsap.from("[data-crumb]", { opacity: 0, x: -10, scale: 0.92, stagger: 0.08, duration: 0.35, ease: "back.out(2)" });
      });
    },
    { dependencies: [value], scope: crumbs },
  );

  const pickL1 = (code: string) => {
    const next = code === ALL ? null : code;
    setL1(next);
    setL2(null);
    if (value && chain.l1?.code !== next) onChange(null);
  };
  const pickL2 = (code: string) => {
    const next = code === ALL ? null : code;
    setL2(next);
    if (next) setL1(rab.byCode.get(next)!.parent!);
    if (value && next && chain.l2?.code !== next) onChange(null);
  };

  const groups = (l2 ? [rab.byCode.get(l2)!] : l1 ? childrenOf(l1) : rab.level(2, true)).filter(Boolean).map((g) => ({ group: g, items: childrenOf(g.code) }));
  const level2 = l1 ? childrenOf(l1) : rab.level(2, true);

  return (
    <div className="grid gap-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <Select value={l1 ?? ALL} onValueChange={pickL1}>
          <SelectTrigger aria-label={`${t.ref} Level 1`} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Semua {t.l1} (L1)</SelectItem>
            {level1.map((n) => (
              <SelectItem key={n.code} value={n.code}>{n.code} {n.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={l2 ?? ALL} onValueChange={pickL2}>
          <SelectTrigger aria-label={`${t.ref} Level 2`} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Semua {t.l2} (L2)</SelectItem>
            {level2.map((n) => (
              <SelectItem key={n.code} value={n.code}>{n.code} {n.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-invalid={invalid || undefined}
            className={cn("group/rab h-auto min-h-10 w-full justify-between gap-2 py-2 text-left font-normal whitespace-normal", invalid && "border-destructive")}
          >
            <span className={cn("min-w-0", !value && "text-muted-foreground")}>
              {chain.l3 ? (
                <>
                  <span className="mr-1.5 text-xs text-muted-foreground tabular-nums">{chain.l3.code}</span>
                  <span className="font-medium">{chain.l3.name}</span>
                  {!rab.active(chain.l3) && <Badge variant="destructive" className="ml-2">tidak berlaku</Badge>}
                </>
              ) : (
                `Pilih ${t.ref} Level 3 — Level 1 & 2 terisi otomatis`
              )}
            </span>
            <Icon icon={ArrowDown01Icon} size={16} className="shrink-0 text-muted-foreground transition-transform duration-300 group-data-[state=open]/rab:rotate-180" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-(--radix-popover-trigger-width) min-w-80 p-0">
          <Command>
            <CommandInput placeholder={`Cari kode atau nama ${t.l3}…`} />
            <CommandList className="max-h-80">
              <CommandEmpty>Tidak ditemukan.</CommandEmpty>
              {groups.map(({ group, items }) => (
                <CommandGroup key={group.code} heading={`${group.code} ${group.name}`}>
                  {items.map((node: RabNode) => (
                    <CommandItem
                      key={node.code}
                      value={`${node.code} ${node.name} ${group.name}`}
                      data-checked={node.code === value}
                      onSelect={() => {
                        onChange(node.code);
                        setOpen(false);
                      }}
                    >
                      <span className="w-24 shrink-0 text-xs text-muted-foreground tabular-nums">{node.code}</span>
                      <span className="line-clamp-2">{node.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {chain.l3 && (
        <div ref={crumbs} className="flex flex-wrap items-center gap-1.5 text-xs" aria-label={`Hierarki ${t.ref} terpilih`}>
          {[chain.l1, chain.l2, chain.l3].map((node, i) => (
            <span key={node!.code} data-crumb className="inline-flex items-center gap-1.5">
              {i > 0 && <Icon icon={ArrowRight01Icon} size={12} className="text-muted-foreground" />}
              <span className={cn("rounded-full px-2.5 py-1", i === 2 ? "bg-brand-teal/15 font-semibold text-foreground" : "bg-muted text-muted-foreground")}>
                <span className="mr-1 tabular-nums opacity-70">L{i + 1}</span>
                {node!.name}
              </span>
            </span>
          ))}
          <Button type="button" variant="ghost" size="icon-xs" aria-label={`Kosongkan ${t.ref}`} onClick={() => onChange(null)} className="transition-transform hover:rotate-90">
            <Icon icon={Cancel01Icon} size={12} />
          </Button>
        </div>
      )}
    </div>
  );
}
