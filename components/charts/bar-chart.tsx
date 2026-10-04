"use client";
import { Bar } from "react-chartjs-2";
import { useInView } from "@/hooks/use-in-view";
import { configureCharts, prefersReducedMotion, resolveColor, seriesColors } from "./theme";

/** `color` boleh nama token, mis. "--brand-teal". */
export type Series = { label: string; data: number[]; color?: string };

type Props = { labels: string[]; series: Series[]; stacked?: boolean; horizontal?: boolean; legend?: boolean };

/** Grafik batang (vertikal/horizontal, opsional bertumpuk) bergaya design system. */
export default function BarChart({ labels, series, stacked = false, horizontal = false, legend = true }: Props) {
  const [ref, inView] = useInView<HTMLDivElement>();
  configureCharts();
  const colors = seriesColors();

  return (
    <div ref={ref} className="relative h-full w-full">
      {inView && (
        <Bar
          data={{
            labels,
            datasets: series.map((s, i) => ({
              label: s.label,
              data: s.data,
              backgroundColor: s.color ? resolveColor(s.color) : colors[i % colors.length],
              borderRadius: stacked ? 4 : 6,
              borderSkipped: false,
              barPercentage: 0.7,
              categoryPercentage: 0.7,
            })),
          }}
          options={{
            indexAxis: horizontal ? "y" : "x",
            animation: prefersReducedMotion() ? false : undefined,
            interaction: { mode: "index", intersect: false },
            plugins: { legend: { display: legend && series.length > 1, position: "top", align: "end" } },
            scales: {
              x: { stacked, grid: { display: horizontal }, border: { display: false } },
              y: { stacked, grid: { display: !horizontal }, border: { display: false }, beginAtZero: true, ticks: { maxTicksLimit: 6 } },
            },
          }}
        />
      )}
    </div>
  );
}
