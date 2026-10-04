"use client";
import { Line } from "react-chartjs-2";
import { useInView } from "@/hooks/use-in-view";
import { configureCharts, prefersReducedMotion } from "./theme";

/** Garis tren mini tanpa sumbu untuk kartu statistik (pola "stats card with area chart" 21st.dev). */
export default function Sparkline({ data, color = "rgba(45,45,47,0.8)" }: { data: number[]; color?: string }) {
  const [ref, inView] = useInView<HTMLDivElement>();
  configureCharts();

  return (
    <div ref={ref} className="relative h-full w-full" aria-hidden>
      {inView && (
        <Line
          data={{
            labels: data.map((_, i) => i),
            datasets: [{ data, borderColor: color, borderWidth: 2, tension: 0.4, pointRadius: 0, fill: true, backgroundColor: "rgba(255,255,255,0.25)" }],
          }}
          options={{
            animation: prefersReducedMotion() ? false : undefined,
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            scales: { x: { display: false }, y: { display: false } },
          }}
        />
      )}
    </div>
  );
}
