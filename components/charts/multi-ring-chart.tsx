"use client";
import { Doughnut } from "react-chartjs-2";
import type { Plugin } from "chart.js";
import { useInView } from "@/hooks/use-in-view";
import { configureCharts, fontFamily, prefersReducedMotion, resolveColor, token } from "./theme";
import { formatNumber } from "@/lib/format";

export const domainColors = ["--brand-teal", "--brand-orange", "--brand-yellow", "--brand-amber", "--brand-sky", "--brand-charcoal"];
export default function MultiRingChart({ labels, values, onSelect }: { labels: string[]; values: number[]; onSelect: (index: number) => void }) {
  const [ref, visible] = useInView<HTMLDivElement>();
  configureCharts();
  const total = values.reduce((a, b) => a + b, 0);
  const percent = (value: number) => {
    const share = total ? value / total * 100 : 0;
    return share > 0 && share < 0.1 ? "<0,1%" : `${share.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`;
  };
  const center: Plugin<"doughnut"> = { id: "inventoryTotal", afterDraw({ ctx, chartArea }) {
    const x = (chartArea.left + chartArea.right) / 2, y = (chartArea.top + chartArea.bottom) / 2;
    ctx.save(); ctx.textAlign = "center"; ctx.fillStyle = token("--foreground"); ctx.font = `700 20px ${fontFamily()}`;
    ctx.fillText(formatNumber(total), x, y); ctx.font = `500 10px ${fontFamily()}`; ctx.fillStyle = token("--muted-foreground"); ctx.fillText("Total inventaris", x, y + 18); ctx.restore();
  } };
  return <div ref={ref} className="@container">
    <div className="grid items-center gap-3 @[420px]:grid-cols-[minmax(0,1fr)_minmax(148px,0.8fr)]">
    <div className="mx-auto h-64 w-full max-w-72 min-w-0" role="img" aria-label={`Komposisi inventaris: ${labels.map((label, i) => `${label} ${values[i]} (${percent(values[i])})`).join(", ")}`}>
      {visible && <Doughnut plugins={[center]} data={{ datasets: values.map((value, i) => ({ label: labels[i], data: [value, total - value], backgroundColor: [resolveColor(domainColors[i % domainColors.length]), token("--muted")], borderColor: token("--card"), borderWidth: 2, borderRadius: 0, spacing: 0, hoverOffset: 0 })) }} options={{
        cutout: "52%", animation: prefersReducedMotion() ? false : { duration: 700 },
        onClick: (_, elements) => { if (elements[0]) onSelect(elements[0].datasetIndex); },
        onHover: (event, elements) => (event.native?.target as HTMLElement | undefined)?.style.setProperty("cursor", elements.length ? "pointer" : "default"),
        plugins: { legend: { display: false }, tooltip: { callbacks: { title: (items) => items[0]?.dataset.label ?? "", label: (item) => `${formatNumber(values[item.datasetIndex])} record · ${percent(values[item.datasetIndex])}` } } },
      }} />}
    </div>
    <div className="grid min-w-0 grid-cols-2 gap-1 @[420px]:grid-cols-1">{labels.map((label, i) => <button key={label} type="button" onClick={() => onSelect(i)} className="flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring" title={`${label}: ${formatNumber(values[i])} record (${percent(values[i])})`}><span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: `var(${domainColors[i % domainColors.length]})` }} /><span className="min-w-0 flex-1 truncate">{label}</span><span className="shrink-0 text-right tabular-nums"><b className="block">{formatNumber(values[i])}</b><span className="text-muted-foreground">{percent(values[i])}</span></span></button>)}</div>
    </div>
  </div>;
}
