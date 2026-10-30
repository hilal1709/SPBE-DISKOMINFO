"use client";
import { StatCard } from "@/components/blocks/stat-card";
import { StatRow } from "@/components/blocks/stat-row";
import type { DiagramStats as Stats } from "./diagram-model";

/** Ringkasan elemen diagram; carousel Swiper di layar sempit lewat StatRow. */
export function DiagramStats({ stats }: { stats: Stats }) {
  return (
    <StatRow>
      <StatCard label="Aktivitas" value={stats.activities} tone="teal" />
      <StatCard label="Gateway" value={stats.gateways} tone="amber" />
      <StatCard label="Event" value={stats.events} tone="sky" />
      <StatCard label="Pool & lane" value={stats.lanes} tone="yellow" />
    </StatRow>
  );
}
