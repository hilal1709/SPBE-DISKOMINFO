"use client";
import { useState } from "react";
import { Download04Icon } from "@hugeicons/core-free-icons";
import { DataTable } from "@/components/blocks/data-table";
import { DetailDialog, DetailField } from "@/components/blocks/detail-dialog";
import { StatusBadge, statusLabel } from "@/components/blocks/status-badge";
import { Icon } from "@/components/icon";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { services } from "@/lib/demo-data";
import type { Service } from "@/lib/types";

/* ---------- Katalog layanan ---------- */

export function ServiceCatalog() {
  const [selected, setSelected] = useState<Service | null>(null);
  return (
    <Reveal className="grid gap-5">
      <DataTable
        title="Layanan seluruh Perangkat Daerah"
        rows={services}
        rowId={(s) => s.id}
        searchText={(s) => [s.name, s.opd, s.rab].join(" ")}
        searchPlaceholder="Cari layanan atau OPD"
        onView={setSelected}
        actions={
          <Button asChild variant="outline">
            <a href="/api/export/layanan">
              <Icon icon={Download04Icon} size={16} />
              Export Excel
            </a>
          </Button>
        }
        columns={[
          { header: "ID", className: "whitespace-nowrap", cell: (s) => <span className="font-medium text-muted-foreground">{s.id}</span> },
          { header: "Status", cell: (s) => <StatusBadge status={s.status} /> },
          { header: "Layanan", cell: (s) => <span className="font-semibold">{s.name}</span> },
          { header: "Perangkat Daerah", cell: (s) => s.opd },
          { header: "RAL", cell: (s) => <span className="text-muted-foreground">{s.ral}</span> },
          { header: "RAB", cell: (s) => <span className="text-muted-foreground">{s.rab}</span> },
        ]}
      />
      {selected && (
        <DetailDialog open onOpenChange={(open) => !open && setSelected(null)} eyebrow={selected.id} title={selected.name} meta={<StatusBadge status={selected.status} />}>
          <div className="grid gap-2 sm:grid-cols-2">
            <DetailField label="Perangkat Daerah" value={selected.opd} />
            <DetailField label="Status" value={statusLabel[selected.status]} />
            <DetailField label="Tujuan" value={selected.purpose} />
            <DetailField label="Fungsi" value={selected.function} />
            <DetailField label="Proses bisnis" value={selected.processBusiness} />
            <DetailField label="Risiko" value={selected.risk} />
          </div>
        </DetailDialog>
      )}
    </Reveal>
  );
}
