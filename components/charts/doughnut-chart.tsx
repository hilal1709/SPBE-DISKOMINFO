"use client";
import type { Plugin } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { useInView } from "@/hooks/use-in-view";
import { configureCharts, fontFamily, prefersReducedMotion, resolveColor, seriesColors, token } from "./theme";

const fmt = new Intl.NumberFormat("id-ID");

/** Plugin kecil: total & keterangan di tengah donat (seperti "342" pada referensi). */
const centerLabel = (value: string, caption: string): Plugin<"doughnut"> => ({
  id: "centerLabel",
  afterDraw(chart) {
    const { ctx, chartArea } = chart;
    const x = (chartArea.left + chartArea.right) / 2;
    const y = (chartArea.top + chartArea.bottom) / 2;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = token("--foreground");
    ctx.font = `700 22px ${fontFamily()}`;
    ctx.fillText(value, x, y - 8);
    ctx.fillStyle = token("--muted-foreground");
    ctx.font = `500 11px ${fontFamily()}`;
    ctx.fillText(caption, x, y + 14);
    ctx.restore();
  },
});

type Props = { labels: string[]; data: number[]; caption?: string; colors?: string[] };

/** Donat komposisi dengan total di tengah dan legend titik di bawah. */
export default function DoughnutChart({ labels, data, caption = "Total", colors }: Props) {
  const [ref, inView] = useInView<HTMLDivElement>();
  configureCharts();
  const palette = colors?.map(resolveColor) ?? seriesColors();
  const total = data.reduce((a, b) => a + b, 0);

  return (
    <div ref={ref} className="relative h-full w-full">
      {inView && (
        <Doughnut
          data={{ labels, datasets: [{ data, backgroundColor: palette, borderColor: token("--card"), borderWidth: 3, hoverOffset: 6, borderRadius: 4 }] }}
          options={{
            cutout: "68%",
            animation: prefersReducedMotion() ? false : { animateRotate: true, duration: 1000 },
            plugins: { legend: { position: "bottom" } },
          }}
          plugins={[centerLabel(fmt.format(total), caption)]}
        />
      )}
    </div>
  );
}
