"use client";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Grafik Chart.js — dimuat hanya di klien dan dirender saat masuk viewport.
 * Grafik mengisi tinggi induknya: bungkus dengan elemen bertinggi tetap (mis. `h-64`).
 */
const loading = () => <Skeleton className="h-full w-full rounded-lg" />;

export const BarChart = dynamic(() => import("./bar-chart"), { ssr: false, loading });
export const DoughnutChart = dynamic(() => import("./doughnut-chart"), { ssr: false, loading });
export const Sparkline = dynamic(() => import("./sparkline"), { ssr: false });
export type { Series } from "./bar-chart";
