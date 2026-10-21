import Pusher from "pusher-js";

let client: Pusher | null | undefined;

/** Satu koneksi Pusher per tab; `null` bila env publik belum diisi. */
export function realtimeClient() {
  if (client !== undefined) return client;
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
  client = key && cluster ? new Pusher(key, { cluster, forceTLS: true }) : null;
  return client;
}
