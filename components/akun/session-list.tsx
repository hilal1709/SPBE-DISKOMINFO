"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { ArrowLeft01Icon, Logout01Icon } from "@hugeicons/core-free-icons";
import { revokeOtherSessionsAction, revokeSessionAction, type SessionActionResult } from "@/app/actions/akun";
import { Logo } from "@/components/brand/logo";
import { Icon } from "@/components/icon";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ActiveSession } from "@/lib/security/session";

const dateTime = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" });

/** Nama perangkat ringkas dari user-agent ("Chrome · Windows"). */
function device(ua: string | null) {
  if (!ua) return "Perangkat tidak dikenal";
  const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Peramban";
  const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
  return os ? `${browser} · ${os}` : browser;
}

/** Sesi aktif akun ini di semua perangkat; perangkat lain bisa dikeluarkan. */
export function SessionList({ email, sessions }: { email: string; sessions: ActiveSession[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const others = sessions.filter((s) => !s.current).length;

  const run = (action: () => Promise<SessionActionResult>, success: string) =>
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(success);
        router.refresh();
      } else toast.error(result.error);
    });

  return (
    <main className="flex min-h-svh flex-col p-6 sm:p-10">
      <Button asChild variant="ghost" className="group -ml-2 self-start text-muted-foreground">
        <Link href="/cms">
          <Icon icon={ArrowLeft01Icon} size={16} className="transition-transform duration-300 group-hover:-translate-x-0.5" />
          Kembali ke CMS
        </Link>
      </Button>

      <Reveal className="m-auto w-full max-w-lg py-10">
        <div data-reveal>
          <Logo href="/cms" subtitle="CMS · Kabupaten Gresik" />
        </div>
        <div data-reveal className="mt-8">
          <p className="eyebrow">{email}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Sesi aktif</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sesi berakhir setelah 30 menit tidak aktif atau 8 jam sejak masuk.</p>
        </div>

        <ul data-reveal className="mt-8 divide-y rounded-lg border">
          {sessions.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-medium">
                  {device(s.userAgent)}
                  {s.current && <Badge variant="secondary">Perangkat ini</Badge>}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {s.ip ? `${s.ip} · ` : ""}aktif {dateTime.format(new Date(s.lastSeenAt))}
                </p>
              </div>
              {!s.current && (
                <Button variant="outline" size="sm" disabled={pending} onClick={() => run(() => revokeSessionAction(s.id), "Perangkat dikeluarkan.")}>
                  Keluarkan
                </Button>
              )}
            </li>
          ))}
        </ul>

        {others > 0 && (
          <Button data-reveal variant="outline" className="mt-6 w-full" loading={pending} onClick={() => run(revokeOtherSessionsAction, "Semua perangkat lain dikeluarkan.")}>
            <Icon icon={Logout01Icon} size={16} />
            Keluarkan semua perangkat lain
          </Button>
        )}
      </Reveal>
    </main>
  );
}
