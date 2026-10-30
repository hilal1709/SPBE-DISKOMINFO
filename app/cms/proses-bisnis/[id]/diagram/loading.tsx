import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-4" aria-busy aria-label="Memuat diagram">
      <Skeleton className="h-12 w-72" />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <Skeleton className="h-[70dvh] min-h-[460px] w-full rounded-xl" />
    </div>
  );
}
