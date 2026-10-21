import { after } from "next/server";
import Pusher from "pusher";
import { REALTIME_CHANNEL, REALTIME_EVENT, type ChangeEvent, type ChangeScope } from "./config";

let client: Pusher | null | undefined;

/** Klien Pusher server; `null` bila env belum diisi sehingga aplikasi tetap jalan tanpa realtime. */
function pusher() {
  if (client !== undefined) return client;
  const { PUSHER_APP_ID: appId, PUSHER_SECRET: secret, NEXT_PUBLIC_PUSHER_KEY: key, NEXT_PUBLIC_PUSHER_CLUSTER: cluster } = process.env;
  client = appId && secret && key && cluster ? new Pusher({ appId, key, secret, cluster, useTLS: true }) : null;
  return client;
}

/**
 * Beri tahu semua perangkat yang sedang membuka web bahwa data berubah. Dikirim setelah respons selesai
 * (cache sudah dibuang), jadi perangkat lain yang memuat ulang langsung mendapat data baru.
 */
export function broadcastChange(scope: ChangeScope) {
  const pusherClient = pusher();
  if (!pusherClient) return;
  const event: ChangeEvent = { scope, at: Date.now() };
  after(() =>
    pusherClient.trigger(REALTIME_CHANNEL, REALTIME_EVENT, event).then(
      () => undefined,
      (error: unknown) => console.warn("Realtime: gagal mengirim perubahan ke Pusher.", error),
    ),
  );
}
