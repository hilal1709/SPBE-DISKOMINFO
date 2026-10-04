"use client";
import { useRef, useState } from "react";
import { ArrowDown01Icon, ArrowLeft01Icon, ArrowRight01Icon, ArrowUp01Icon, ArrowUpDownIcon, LayoutTable01Icon, Search01Icon, ViewIcon } from "@hugeicons/core-free-icons";
import { EmptyState } from "@/components/blocks/empty-state";
import { Icon } from "@/components/icon";
import { MOTION_OK, gsap, useGSAP } from "@/components/motion/gsap";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type Column<T> = {
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
  /** Nilai pengurutan; jika ada, header menjadi tombol sort. */
  sortValue?: (row: T) => string | number;
  /** Kolom bisa disembunyikan lewat menu "Kolom". */
  hideable?: boolean;
  defaultHidden?: boolean;
};

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
  /** Klik seluruh baris (mis. membuka detail). */
  onRowClick?: (row: T) => void;
  limit?: number;
  /** Aktifkan paginasi dengan jumlah baris per halaman. */
  pageSize?: number;
  minWidth?: number;
};

const collator = new Intl.Collator("id", { numeric: true });

/** Tabel katalog dengan pencarian, sort, paginasi, pilihan kolom, aksi detail, dan empty state berilustrasi. */
export function DataTable<T>({ title, description, rows, columns, rowId, searchText, searchPlaceholder = "Cari data", actions, onView, onRowClick, limit, pageSize, minWidth = 860 }: Props<T>) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ header: string; dir: 1 | -1 } | null>(null);
  const [hidden, setHidden] = useState(() => new Set(columns.filter((c) => c.defaultHidden).map((c) => c.header)));
  const [page, setPage] = useState(0);
  const body = useRef<HTMLTableSectionElement>(null);

  const visible = columns.filter((c) => !hidden.has(c.header));
  const sortColumn = sort && columns.find((c) => c.header === sort.header);
  const matched = rows.filter((row) => searchText(row).toLowerCase().includes(query.trim().toLowerCase()));
  if (sortColumn?.sortValue) {
    const value = sortColumn.sortValue;
    matched.sort((a, b) => {
      const x = value(a), y = value(b);
      return (typeof x === "number" && typeof y === "number" ? x - y : collator.compare(String(x), String(y))) * sort!.dir;
    });
  }
  const pages = pageSize ? Math.max(1, Math.ceil(matched.length / pageSize)) : 1;
  const current = Math.min(page, pages - 1);
  const filtered = pageSize ? matched.slice(current * pageSize, (current + 1) * pageSize) : matched.slice(0, limit);

  const mounted = useRef(false);
  /** Baris masuk berurutan saat pencarian, halaman, atau urutan berubah. */
  useGSAP(
    () => {
      if (!mounted.current) {
        mounted.current = true;
        return;
      }
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.from(body.current?.children ?? [], { opacity: 0, y: 6, duration: 0.3, stagger: 0.02, clearProps: "opacity,transform" });
      });
    },
    { dependencies: [query, current, sort?.header, sort?.dir, rows], scope: body },
  );

  const toggleSort = (header: string) => {
    setSort((s) => (s?.header !== header ? { header, dir: 1 } : s.dir === 1 ? { header, dir: -1 } : null));
    setPage(0);
  };
  const toggleColumn = (header: string, show: boolean) =>
    setHidden((h) => {
      const next = new Set(h);
      if (show) next.delete(header);
      else next.add(header);
      return next;
    });

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
            <InputGroupInput
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(0);
              }}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
            />
          </InputGroup>
          {columns.some((c) => c.hideable) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Icon icon={LayoutTable01Icon} size={16} />
                  Kolom
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Tampilkan kolom</DropdownMenuLabel>
                {columns.filter((c) => c.hideable).map((c) => (
                  <DropdownMenuCheckboxItem key={c.header} checked={!hidden.has(c.header)} onCheckedChange={(show) => toggleColumn(c.header, show)} onSelect={(e) => e.preventDefault()}>
                    {c.header}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {actions}
        </div>
      </div>

      {filtered.length ? (
        <Table style={{ minWidth }}>
          <TableHeader className="bg-accent/60">
            <TableRow className="hover:bg-transparent">
              {visible.map((column) => (
                <TableHead
                  key={column.header}
                  aria-sort={sort?.header === column.header ? (sort.dir === 1 ? "ascending" : "descending") : undefined}
                  className={cn("h-10 px-4 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase", column.className)}
                >
                  {column.sortValue ? (
                    <button type="button" onClick={() => toggleSort(column.header)} className="-mx-1 inline-flex items-center gap-1 rounded px-1 uppercase hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                      {column.header}
                      <Icon icon={sort?.header !== column.header ? ArrowUpDownIcon : sort.dir === 1 ? ArrowUp01Icon : ArrowDown01Icon} size={14} className={cn(sort?.header !== column.header && "opacity-50")} />
                    </button>
                  ) : (
                    column.header
                  )}
                </TableHead>
              ))}
              {onView && <TableHead className="w-16 px-4"><span className="sr-only">Aksi</span></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody ref={body}>
            {filtered.map((row) => (
              <TableRow
                key={rowId(row)}
                className={cn("group/row transition-colors", onRowClick && "cursor-pointer hover:bg-accent/50 focus-visible:bg-muted/60 focus-visible:outline-none")}
                onClick={onRowClick && (() => onRowClick(row))}
                onKeyDown={onRowClick && ((e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onRowClick(row)))}
                tabIndex={onRowClick ? 0 : undefined}
              >
                {visible.map((column) => (
                  <TableCell key={column.header} className={cn("px-4 py-3.5 whitespace-normal", column.className)}>
                    {column.cell(row)}
                  </TableCell>
                ))}
                {onView && (
                  <TableCell className="px-4">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onView(row);
                          }}
                          aria-label="Lihat detail"
                          className="opacity-70 transition-opacity group-hover/row:opacity-100"
                        >
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

      {pageSize && matched.length > pageSize && (
        <div className="flex items-center justify-between gap-3 border-t px-4 py-3 text-xs text-muted-foreground">
          <span className="tabular-nums">
            {current * pageSize + 1}–{Math.min((current + 1) * pageSize, matched.length)} dari {matched.length.toLocaleString("id-ID")}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" aria-label="Halaman sebelumnya" disabled={current === 0} onClick={() => setPage(current - 1)}>
              <Icon icon={ArrowLeft01Icon} size={16} />
            </Button>
            <span className="px-1 tabular-nums">{current + 1} / {pages}</span>
            <Button variant="ghost" size="icon-sm" aria-label="Halaman berikutnya" disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>
              <Icon icon={ArrowRight01Icon} size={16} />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
