"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Add01Icon, Download04Icon } from "@hugeicons/core-free-icons";
import { DataTable, type ServerPaging } from "@/components/blocks/data-table";
import { EmptyState } from "@/components/blocks/empty-state";
import { FilterBar } from "@/components/blocks/filter-bar";
import { ReviewBadge } from "@/components/cms/review-badge";
import { ProbisDetail } from "@/components/cms/probis-detail";
import { Icon } from "@/components/icon";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { StatusTabs } from "@/components/cms/status-tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { can, type Actor } from "@/lib/permissions";
import { useRabSet } from "@/components/probis/rab-context";
import { perangkatDaerah, statusLabel as probisLabel, type PeriodOptions } from "@/lib/probis/reference";
import { PAGE_SIZE, probisParams, type ProbisView } from "@/lib/probis/table-params";
import type { ProbisRecord } from "@/lib/types";

type Tab = ProbisView["tab"];

const tabs: { value: Tab; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "draft", label: "Draf" },
  { value: "submitted", label: "Diajukan" },
  { value: "verified", label: "Diverifikasi" },
  { value: "approved", label: "Disetujui" },
  { value: "rejected", label: "Dikembalikan" },
  { value: "review", label: "Perlu pemetaan RAB" },
];

/**
 * Daftar probis CMS: tab status, filter, tabel ramping (kolom inti), detail via pop-up. Ribuan baris, jadi filter,
 * pencarian, urutan, dan halaman disimpan di URL dan dihitung server (app/cms/proses-bisnis/page.tsx); yang dikirim
 * ke browser hanya satu halaman.
 */
export function ProbisTable({
  page: { rows, counts: totals, total },
  view,
  empty,
  actor,
  periods,
}: {
  page: { rows: ProbisRecord[]; counts: Record<Tab, number>; total: number };
  view: ProbisView;
  /** Belum ada probis sama sekali dalam cakupan pengguna. */
  empty: boolean;
  actor: Actor;
  periods: PeriodOptions;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const rabs = useRabSet();
  /** Nama RAB mengikuti versi RAB periode masing-masing probis. */
  const rab = (code: string | null, period: string) => (code ? rabs.forPeriod(period).label(code) : "—");
  const deep = (value: string | null, period: string) => rabs.forPeriod(period).text(value) ?? "—";
  const [selected, setSelected] = useState<ProbisRecord | null>(null);
  const { tab, pd, rab1, period } = view;

  /** Ubah tampilan lewat URL; server menghitung halaman baru tanpa memuat ulang halaman. */
  const update = (patch: Partial<ProbisView>) => {
    const query = probisParams({ ...view, page: 0, ...patch }).toString();
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }));
  };
  const setTab = (value: Tab) => update({ tab: value });
  const setPd = (value: string[]) => update({ pd: value });
  const setRab1 = (value: string[]) => update({ rab1: value });
  const setPeriod = (value: string) => update({ period: value });
  const counts = new Map<string, number>(Object.entries(totals));
  const server: ServerPaging = {
    total,
    page: view.page,
    query: view.q,
    sort: view.sort,
    pending,
    onChange: (next) => update({ page: next.page ?? 0, ...(next.query !== undefined && { q: next.query }), ...(next.sort !== undefined && { sort: next.sort }) }),
  };

  if (empty) {
    return (
      <Card data-reveal>
        <EmptyState title="Belum ada proses bisnis" description="Tambahkan satu per satu dengan bantuan AI, atau impor template Excel arsitektur.">
          {can.create(actor) && (
            <Button asChild variant="teal">
              <Link href="/cms/proses-bisnis/baru">
                <Icon icon={Add01Icon} size={16} />
                Tambah probis
              </Link>
            </Button>
          )}
          {can.import(actor) && (
            <Button asChild variant="outline">
              <Link href="/cms/impor">Impor template</Link>
            </Button>
          )}
        </EmptyState>
      </Card>
    );
  }

  return (
    <Reveal className="grid gap-4">
      <StatusTabs value={tab} onChange={setTab} counts={counts} tabs={tabs.filter((t) => t.value !== "review" || counts.get("review"))} />

      <FilterBar
        filters={[
          ...(can.readAll(actor) ? [{ label: "Perangkat Daerah", wide: true, multiple: true, searchable: true, options: perangkatDaerah.map((p) => ({ value: p.code, label: p.name })), values: pd, onValuesChange: setPd }] : []),
          { label: "RAB 1", multiple: true, options: rabs.forPeriod(period === "__all" ? undefined : period).level(1).map((n) => ({ value: n.code, label: `${n.code} ${n.name}` })), values: rab1, onValuesChange: setRab1 },
          { label: "Periode", options: periods.periods, value: period, onChange: setPeriod },
        ]}
      />

      <DataTable
        title={tab === "all" ? "Semua status" : tabs.find((t) => t.value === tab)!.label}
        rows={rows}
        server={server}
        rowId={(r) => r.id}
        searchText={(r) => `${r.code} ${r.name} ${r.opdName}`}
        searchPlaceholder="Cari nama, ID, atau OPD"
        onRowClick={setSelected}
        pageSize={PAGE_SIZE}
        minWidth={860}
        actions={
          <>
            {can.export(actor) && (
              <Button asChild variant="outline">
                <a href="/api/export/proses-bisnis">
                  <Icon icon={Download04Icon} size={16} />
                  Ekspor
                </a>
              </Button>
            )}
            {can.create(actor) && (
              <Button asChild variant="teal">
                <Link href="/cms/proses-bisnis/baru">
                  <Icon icon={Add01Icon} size={16} />
                  Tambah
                </Link>
              </Button>
            )}
          </>
        }
        columns={[
          { header: "Status", sortKey: "status", sortValue: (r) => r.status, cell: (r) => <ReviewBadge status={r.status} /> },
          { header: "ID", className: "whitespace-nowrap", sortKey: "code", sortValue: (r) => r.code, cell: (r) => <span className="text-muted-foreground tabular-nums">{r.code}</span> },
          {
            header: "Nama proses bisnis",
            sortKey: "name", sortValue: (r) => r.name,
            cell: (r) => (
              <span className="font-semibold">
                {r.name}
                {r.isSample && <Badge variant="muted" className="ml-2 align-middle">Contoh</Badge>}
                {r.rabReview && <Badge variant="warning" className="ml-2 align-middle">Perlu pemetaan RAB</Badge>}
              </span>
            ),
          },
          { header: "Perangkat Daerah", hideable: true, sortKey: "opd", sortValue: (r) => r.opdName, cell: (r) => r.opdName },
          { header: "RAB 3", hideable: true, sortKey: "rab3", sortValue: (r) => r.rab3 ?? "", cell: (r) => <span className="text-muted-foreground">{rab(r.rab3, r.period)}</span> },
          { header: "Status probis", hideable: true, defaultHidden: true, sortKey: "probisStatus", sortValue: (r) => r.probisStatus, cell: (r) => probisLabel[r.probisStatus] },
          { header: "RAB 1", hideable: true, defaultHidden: true, sortKey: "rab1", sortValue: (r) => r.rab1 ?? "", cell: (r) => <span className="text-muted-foreground">{rab(r.rab1, r.period)}</span> },
          { header: "RAB 2", hideable: true, defaultHidden: true, sortKey: "rab2", sortValue: (r) => r.rab2 ?? "", cell: (r) => <span className="text-muted-foreground">{rab(r.rab2, r.period)}</span> },
          { header: "RAB 4", hideable: true, defaultHidden: true, sortKey: "rabL4", sortValue: (r) => r.rabL4 ?? "", cell: (r) => <span className="text-muted-foreground">{deep(r.rabL4, r.period)}</span> },
          { header: "RAB 5", hideable: true, defaultHidden: true, sortKey: "rabL5", sortValue: (r) => r.rabL5 ?? "", cell: (r) => <span className="text-muted-foreground">{deep(r.rabL5, r.period)}</span> },
          { header: "Sasaran strategis", hideable: true, defaultHidden: true, cell: (r) => <span className="line-clamp-2 text-muted-foreground">{r.strategicGoal ?? "—"}</span> },
          { header: "IKU", hideable: true, defaultHidden: true, cell: (r) => r.iku ?? "—" },
          { header: "Target / realisasi", hideable: true, defaultHidden: true, cell: (r) => `${r.ikuTarget ?? "—"} / ${r.ikuRealization ?? "—"}` },
          { header: "Periode", hideable: true, defaultHidden: true, sortKey: "period", sortValue: (r) => r.period, cell: (r) => r.period },
        ]}
      />

      {selected && <ProbisDetail record={selected} actor={actor} onClose={() => setSelected(null)} />}
    </Reveal>
  );
}
