import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SessionList } from "@/components/akun/session-list";
import { sessionActor } from "@/lib/access";
import { listSessions } from "@/lib/security/session";
import { noIndex } from "@/lib/seo";

export const metadata: Metadata = { title: "Sesi aktif", ...noIndex };

export default async function Page() {
  const session = await auth();
  if (!session?.user?.sid || session.user.id === "demo-admin") redirect("/login");
  const actor = await sessionActor();
  if (!actor) redirect("/login?pesan=sesi");
  if (actor.mustChangePassword) redirect("/akun/sandi");
  return <SessionList email={session.user.email ?? ""} sessions={await listSessions(session.user.id, session.user.sid)} />;
}
