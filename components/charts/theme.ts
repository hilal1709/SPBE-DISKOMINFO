"use client";
import {
  ArcElement, BarController, BarElement, CategoryScale, Chart, DoughnutController, Filler, Legend,
  LineController, LineElement, LinearScale, PointElement, Tooltip,
} from "chart.js";

Chart.register(ArcElement, BarController, BarElement, CategoryScale, DoughnutController, Filler, Legend, LineController, LineElement, LinearScale, PointElement, Tooltip);

/** Membaca token warna dari CSS (termasuk override [data-theme]) agar grafik mengikuti palet di globals.css. */
export function token(name: string) {
  const root = document.querySelector("[data-theme]") ?? document.documentElement;
  return getComputedStyle(root).getPropertyValue(name).trim();
}

/** Terima nama token ("--brand-teal") atau warna CSS biasa. */
export function resolveColor(color: string) {
  return color.startsWith("--") ? token(color) : color;
}

/** Urutan warna seri: kuning, amber, oranye, teal, biru muda (--chart-1..5). */
export function seriesColors() {
  return [1, 2, 3, 4, 5].map((i) => token(`--chart-${i}`));
}

export const fontFamily = () => getComputedStyle(document.body).fontFamily;

let configured = false;

/** Default global Chart.js: tipografi, grid tipis, tooltip pil charcoal, legend titik bulat. */
export function configureCharts() {
  if (configured) return;
  configured = true;
  const d = Chart.defaults;
  d.font.family = fontFamily();
  d.font.size = 12;
  d.color = token("--muted-foreground");
  d.borderColor = token("--border");
  d.maintainAspectRatio = false;
  // Ubah properti, jangan ganti objeknya: Chart.js menyimpan konfigurasi animasi warna (interpolator "color")
  // di objek default ini. Menggantinya membuat animasi warna gagal ("this._fn is not a function").
  if (d.animation) {
    d.animation.duration = 900;
    d.animation.easing = "easeOutQuart";
  }

  const tooltip = d.plugins.tooltip;
  tooltip.backgroundColor = () => token("--brand-charcoal");
  tooltip.titleColor = "#ffffff";
  tooltip.bodyColor = "#e6e9ec";
  tooltip.titleFont = { weight: "bold", size: 12 };
  tooltip.padding = 10;
  tooltip.cornerRadius = 10;
  tooltip.boxPadding = 4;
  tooltip.usePointStyle = true;

  const legend = d.plugins.legend.labels;
  legend.usePointStyle = true;
  legend.pointStyle = "circle";
  legend.boxWidth = 8;
  legend.boxHeight = 8;
  legend.padding = 14;
}

export const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
