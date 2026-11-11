"use client";
import { flowLanes, type AppFlow as Flow, type DomainNode, type FlowLane } from "@/lib/integrasi/model";
import { cn } from "@/lib/utils";

/**
 * Lajur aliran satu aplikasi: layanan yang didukung, data masuk dan keluar, infrastruktur yang menjalankannya,
 * dan kegiatan keamanan yang melindunginya. Lajur Keamanan hanya tampil bila `securityVisible`.
 */
export function AppFlowLanes({ flow, securityVisible, onOpen }: { flow: Flow; securityVisible: boolean; /** Buka rincian record di lajur. */ onOpen: (node: DomainNode) => void }) {
  const lanes = flowLanes.filter((lane) => lane.key !== "keamanan" || securityVisible);
  return (
    <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={`Aliran integrasi ${flow.app.name}, geser untuk melihat seluruh lajur`}>
      <ol className="grid min-w-max auto-cols-[minmax(11rem,1fr)] grid-flow-col gap-3">
        {lanes.slice(0, 2).map((lane) => (
          <Lane key={lane.key} lane={lane} items={flow[lane.key]} onOpen={onOpen} />
        ))}
        <li className="grid content-start gap-2">
          <p className="eyebrow">Aplikasi</p>
          <div className="rounded-xl bg-brand-teal p-3 text-on-brand">
            <p className="text-[10px] tabular-nums opacity-80">{flow.app.code}</p>
            <p className="text-sm leading-snug font-semibold">{flow.app.name}</p>
          </div>
          {flow.dataLain.length > 0 && (
            <div className="grid gap-1.5">
              <p className="text-xs text-muted-foreground">Data lain yang digunakan</p>
              {flow.dataLain.map((n) => (
                <Item key={n.id} node={n} onOpen={onOpen} />
              ))}
            </div>
          )}
        </li>
        {lanes.slice(2).map((lane) => (
          <Lane key={lane.key} lane={lane} items={flow[lane.key]} onOpen={onOpen} />
        ))}
      </ol>
    </div>
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
