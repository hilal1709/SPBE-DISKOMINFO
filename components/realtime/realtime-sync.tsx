"use client";
import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import { REALTIME_CHANNEL, REALTIME_EVENT } from "@/lib/realtime/config";
import { realtimeClient } from "@/lib/realtime/client";

/** Gabungkan beberapa perubahan beruntun (mis. impor massal) menjadi satu muat ulang. */
const DEBOUNCE_MS = 400;

/**
 * Sinkronkan halaman dengan data terbaru di semua perangkat: muat ulang data server (tanpa reload penuh,
 * state form tetap) saat CMS menyimpan perubahan, saat tab kembali aktif, dan saat koneksi tersambung ulang.
 */
export function RealtimeSync() {
  const router = useRouter();
  const [, startTransition] = useTransition();

  useEffect(() => {
    const pusher = realtimeClient();
    if (!pusher) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    let hiddenSince: number | null = null;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => startTransition(() => router.refresh()), DEBOUNCE_MS);
    };

    const channel = pusher.subscribe(REALTIME_CHANNEL);
    channel.bind(REALTIME_EVENT, refresh);

    // Perubahan yang terjadi selama tab tersembunyi atau koneksi putus tidak boleh terlewat.
    const onVisibility = () => {
      if (document.visibilityState === "hidden") hiddenSince = Date.now();
      else if (hiddenSince !== null) {
        hiddenSince = null;
        refresh();
      }
    };
    let wasConnected = false;
    const onState = ({ current }: { current: string }) => {
      if (current !== "connected") return;
      if (wasConnected) refresh();
      wasConnected = true;
    };
    document.addEventListener("visibilitychange", onVisibility);
    pusher.connection.bind("state_change", onState);

    return () => {
      clearTimeout(timer);
      channel.unbind(REALTIME_EVENT, refresh);
      pusher.unsubscribe(REALTIME_CHANNEL);
      pusher.connection.unbind("state_change", onState);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router]);

  return null;
}
