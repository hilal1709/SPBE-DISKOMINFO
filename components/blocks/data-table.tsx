"use client";
import { useRef, useState } from "react";
import { Search01Icon, ViewIcon } from "@hugeicons/core-free-icons";
import { EmptyState } from "@/components/blocks/empty-state";
import { Icon } from "@/components/icon";
import { MOTION_OK, gsap, useGSAP } from "@/components/motion/gsap";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type Column<T> = { header: string; cell: (row: T) => React.ReactNode; className?: string };

type Props<T> = {
  title: string;
  description?: string;
  rows: T[];
  columns: Column<T>[];
  rowId: (row: T) => string;
  /** Teks yang dicari untuk setiap baris. */
  searchText: (row: T) => string;
  searchPlaceholder?: string;
  actions?: React.ReactNode;
  onView?: (row: T) => void;
  limit?: number;
  minWidth?: number;
};

/** Tabel katalog dengan pencarian, aksi detail, dan empty state berilustrasi. */
export function DataTable<T>({ title, description, rows, columns, rowId, searchText, searchPlaceholder = "Cari data", actions, onView, limit, minWidth = 860 }: Props<T>) {
  const [query, setQuery] = useState("");
  const body = useRef<HTMLTableSectionElement>(null);
  const filtered = rows.filter((row) => searchText(row).toLowerCase().includes(query.trim().toLowerCase())).slice(0, limit);

  useGSAP(
    () => {
      if (!query) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.from(body.current?.children ?? [], { opacity: 0, y: 6, duration: 0.3, stagger: 0.03 });
      });
    },
    { dependencies: [query], scope: body },
  );

  return (
    <Card className="gap-0 py-0" data-reveal>
      <div className="flex flex-wrap items-center gap-3 border-b p-4">
        <div className="min-w-0">
          <h2 className="section-title">{title}</h2>
          {description && <p className="mt-0.5 pl-3 text-xs text-muted-foreground">{description}</p>}
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
          <InputGroup className="sm:w-72">
            <InputGroupAddon>
              <Icon icon={Search01Icon} size={16} />
            </InputGroupAddon>
            <InputGroupInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchPlaceholder} aria-label={searchPlaceholder} />
          </InputGroup>
          {actions}
        </div>
      </div>

      {filtered.length ? (
        <Table style={{ minWidth }}>
          <TableHeader className="bg-accent/60">
            <TableRow className="hover:bg-transparent">
              {columns.map((column) => (
                <TableHead key={column.header} className={cn("h-10 px-4 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase", column.className)}>
                  {column.header}
                </TableHead>
              ))}
              {onView && <TableHead className="w-16 px-4"><span className="sr-only">Aksi</span></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody ref={body}>
            {filtered.map((row) => (
              <TableRow key={rowId(row)} className="group/row">
                {columns.map((column) => (
                  <TableCell key={column.header} className={cn("px-4 py-3.5 whitespace-normal", column.className)}>
                    {column.cell(row)}
                  </TableCell>
                ))}
                {onView && (
                  <TableCell className="px-4">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon-sm" onClick={() => onView(row)} aria-label="Lihat detail" className="opacity-70 transition-opacity group-hover/row:opacity-100">
                          <Icon icon={ViewIcon} size={16} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Lihat detail</TooltipContent>
                    </Tooltip>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <EmptyState size="sm" className="py-10" title="Tidak ada data yang cocok" description={query ? `Tidak ditemukan hasil untuk “${query}”. Coba kata kunci lain.` : "Belum ada data pada katalog ini."}>
          {query && <Button variant="outline" onClick={() => setQuery("")}>Hapus pencarian</Button>}
        </EmptyState>
      )}
    </Card>
  );
}
