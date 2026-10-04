"use client";
import { Chart } from "chart.js";
import { Bar } from "react-chartjs-2";
import { useInView } from "@/hooks/use-in-view";
import { configureCharts, prefersReducedMotion, resolveColor, seriesColors } from "./theme";

/** `color` boleh nama token, mis. "--brand-teal". `colors` memberi warna per batang (seri tunggal multi-warna). */
export type Series = { label: string; data: number[]; color?: string; colors?: string[] };

type Props = {
  labels: string[];
  series: Series[];
  stacked?: boolean;
  horizontal?: boolean;
  legend?: boolean;
  /** Klik batang (indeks label, indeks seri) — membuat grafik berfungsi sebagai filter. */
  onSelect?: (label: number, series: number) => void;
  /** Batang terpilih; batang lain diredupkan. */
  selected?: { label: number; series: number }[];
};

/** Warna hex dengan alfa (untuk meredupkan batang yang tidak dipilih). */
const faded = (color: string) => (/^#[0-9a-f]{6}$/i.test(color) ? `${color}40` : color);

/** Grafik batang (vertikal/horizontal, opsional bertumpuk) bergaya design system. */
export default function BarChart({ labels, series, stacked = false, horizontal = false, legend = true, onSelect, selected = [] }: Props) {
  const [ref, inView] = useInView<HTMLDivElement>();
  configureCharts();
  const colors = seriesColors();
  const solid = series.map((s, i) => (s.color ? resolveColor(s.color) : colors[i % colors.length]!));

  return (
    <div ref={ref} className="relative h-full w-full">
      {inView && (
        <Bar
          data={{
            labels,
            datasets: series.map((s, i) => {
              const color = s.color ? resolveColor(s.color) : colors[i % colors.length]!;
              const perBar = s.colors?.map(resolveColor);
              const at = (j: number) => perBar?.[j % perBar.length] ?? color;
              return {
                label: s.label,
                data: s.data,
                backgroundColor: selected.length ? s.data.map((_, j) => (selected.some((x) => x.label === j && x.series === i) ? at(j) : faded(at(j)))) : perBar ? s.data.map((_, j) => at(j)) : color,
                borderRadius: stacked ? 4 : 6,
                borderSkipped: false,
                barPercentage: 0.7,
                categoryPercentage: 0.7,
              };
            }),
          }}
          options={{
            indexAxis: horizontal ? "y" : "x",
            animation: prefersReducedMotion() ? false : undefined,
            interaction: onSelect ? { mode: "nearest", intersect: true } : { mode: "index", intersect: false },
            onClick: onSelect ? (_, elements) => elements[0] && onSelect(elements[0].index, elements[0].datasetIndex) : undefined,
            onHover: onSelect ? (event, elements) => (event.native?.target as HTMLElement | undefined)?.style.setProperty("cursor", elements.length ? "pointer" : "default") : undefined,
            plugins: {
              legend: {
                display: legend && series.length > 1,
                position: "top",
                align: "end",
                // Legend tetap berwarna penuh walau sebagian batang diredupkan.
                labels: { generateLabels: (chart) => Chart.defaults.plugins.legend.labels.generateLabels(chart).map((item, i) => ({ ...item, fillStyle: solid[i], strokeStyle: solid[i] })) },
              },
            },
            scales: {
              // Batasi tick hanya di sumbu nilai; sumbu kategori menampilkan semua label.
              x: { stacked, grid: { display: horizontal }, border: { display: false }, ...(horizontal && { beginAtZero: true, ticks: { maxTicksLimit: 6 } }) },
              y: { stacked, grid: { display: !horizontal }, border: { display: false }, beginAtZero: true, ticks: horizontal ? { autoSkip: false } : { maxTicksLimit: 6 } },
            },
          }}
        />
      )}
    </div>
  );
}
