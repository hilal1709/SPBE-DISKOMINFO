"use client";
import { useMemo } from "react";
import { DataTable } from "@/components/blocks/data-table";
import { EmptyState } from "@/components/blocks/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/format";
import { appFlows, flowLanes, type AppFlow as Flow, type DomainEdge, type DomainNode, type FlowLane } from "@/lib/integrasi/model";
import { cn } from "@/lib/utils";

/**
 * Integrasi berpusat pada aplikasi: layanan yang didukung, aliran data masuk dan keluar, infrastruktur yang
 * menjalankannya, dan kegiatan keamanan yang melindunginya. Lajur Keamanan hanya tampil bila pengguna berhak.
 */
export function AppFlow({
  nodes,
  edges,
  securityVisible,
  selectedId,
  onSelect,
  onOpen,
}: {
  nodes: DomainNode[];
  edges: DomainEdge[];
  securityVisible: boolean;
  selectedId: string;
  onSelect: (id: string) => void;
  /** Buka rincian record di lajur. */
  onOpen: (node: DomainNode) => void;
}) {
  const flows = useMemo(() => appFlows(nodes, edges), [nodes, edges]);
  const lanes = flowLanes.filter((lane) => lane.key !== "keamanan" || securityVisible);
  const selected = flows.find((f) => f.app.id === selectedId) ?? flows[0] ?? null;

  if (!flows.length) {
    return (
      <Card data-reveal>
        <EmptyState illustration="filter-empty" title="Belum ada aplikasi tervalidasi" description="Pilih Perangkat Daerah atau periode lain." />
      </Card>
    );
  }

  return (
    <>
      <div data-aos="fade-blur" suppressHydrationWarning>
        <Card>
          <CardHeader>
            <CardTitle as="h2">{selected!.app.name}</CardTitle>
            <CardDescription>
              {selected!.app.code} · {selected!.app.opdName}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={`Aliran integrasi ${selected!.app.name}, geser untuk melihat seluruh lajur`}>
              <ol className="grid min-w-max auto-cols-[minmax(11rem,1fr)] grid-flow-col gap-3">
                {lanes.slice(0, 2).map((lane) => (
                  <Lane key={lane.key} lane={lane} items={selected![lane.key]} onOpen={onOpen} />
                ))}
                <li className="grid content-start gap-2">
                  <p className="eyebrow">Aplikasi</p>
                  <div className="rounded-xl bg-brand-teal p-3 text-on-brand">
                    <p className="text-[10px] tabular-nums opacity-80">{selected!.app.code}</p>
                    <p className="text-sm leading-snug font-semibold">{selected!.app.name}</p>
                  </div>
                  {selected!.dataLain.length > 0 && (
                    <div className="grid gap-1.5">
                      <p className="text-xs text-muted-foreground">Data lain yang digunakan</p>
                      {selected!.dataLain.map((n) => (
                        <Item key={n.id} node={n} onOpen={onOpen} />
                      ))}
                    </div>
                  )}
                </li>
                {lanes.slice(2).map((lane) => (
                  <Lane key={lane.key} lane={lane} items={selected![lane.key]} onOpen={onOpen} />
                ))}
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>

      <DataTable
        title="Aliran data aplikasi"
        rows={flows}
        rowId={(f) => f.app.id}
        searchText={(f) => `${f.app.code} ${f.app.name} ${f.app.opdName}`}
        searchPlaceholder="Cari aplikasi atau PD"
        onRowClick={(f) => onSelect(f.app.id)}
        pageSize={10}
        minWidth={880}
        columns={[
          {
            header: "Aplikasi",
            sortValue: (f) => f.app.name,
            cell: (f) => (
              <span className="grid gap-0.5">
                <span className="font-semibold">
                  {f.app.name}
                  {f.app.id === selected!.app.id && <Badge className="ml-2 align-middle" variant="secondary">Dipilih</Badge>}
                </span>
                <span className="text-xs text-muted-foreground">{f.app.opdName}</span>
              </span>
            ),
          },
          ...lanes.map((lane) => ({
            header: lane.label,
            className: "text-center",
            sortValue: (f: Flow) => f[lane.key].length,
            cell: (f: Flow) => (f[lane.key].length ? <span className="tabular-nums">{formatNumber(f[lane.key].length)}</span> : <Badge variant="muted">Belum</Badge>),
          })),
        ]}
      />
    </>
  );
}

function Lane({ lane, items, onOpen }: { lane: FlowLane; items: DomainNode[]; onOpen: (node: DomainNode) => void }) {
  return (
    <li className="grid content-start gap-2">
      <p className="eyebrow">
        {lane.label} <span className="tabular-nums">· {items.length}</span>
      </p>
      {items.length ? (
        <div className="grid gap-1.5">
          {items.slice(0, 8).map((n) => (
            <Item key={n.id} node={n} onOpen={onOpen} />
          ))}
          {items.length > 8 && <p className="text-xs text-muted-foreground">+{items.length - 8} lainnya</p>}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed p-3 text-xs text-muted-foreground">{lane.empty}</p>
      )}
    </li>
  );
}

function Item({ node, onOpen }: { node: DomainNode; onOpen: (node: DomainNode) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(node)}
      title={`${node.code}: ${node.name}`}
      className={cn("rounded-xl border bg-card px-3 py-2 text-left shadow-card transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none")}
    >
      <span className="block truncate text-[10px] text-muted-foreground tabular-nums">{node.code}</span>
      <span className="line-clamp-2 text-xs font-semibold">{node.name}</span>
    </button>
  );
}
