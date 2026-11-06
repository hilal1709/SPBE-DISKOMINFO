"use client";
import { usePathname } from "next/navigation";
import { DashboardSkeleton } from "@/components/blocks/dashboard-skeleton";

/** Juga dipakai segmen anak tanpa loading.tsx sendiri; Ringkasan Umum punya enam kartu domain. */
export default function Loading() {
  return <DashboardSkeleton stats={usePathname() === "/" ? 6 : 4} />;
}
