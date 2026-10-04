import { Loader } from "@/components/loader";
import { Skeleton } from "@/components/ui/skeleton";

/** Fallback loading.tsx: loader bermerek di atas kerangka dashboard. */
export function DashboardSkeleton({ label = "Memuat dashboard" }: { label?: string }) {
  return (
    <div className="relative">
      <div aria-hidden className="grid gap-5 opacity-60">
        <Skeleton className="h-14 rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <div className="grid gap-5 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
      <div className="absolute inset-x-0 top-28 flex justify-center">
        <Loader label={label} className="rounded-2xl bg-card/90 px-8 py-5 shadow-raised backdrop-blur" />
      </div>
    </div>
  );
}
