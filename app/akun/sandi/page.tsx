import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ChangePasswordForm } from "@/components/akun/change-password-form";
import { sessionActor } from "@/lib/access";
import { noIndex } from "@/lib/seo";

export const metadata: Metadata = { title: "Ganti sandi", ...noIndex };

export default async function Page() {
  const session = await auth();
  if (!session?.user || session.user.id === "demo-admin") redirect("/login");
  const actor = await sessionActor();
  if (!actor) redirect("/login?pesan=sesi");
  return <ChangePasswordForm forced={!!actor.mustChangePassword} email={session.user.email ?? ""} name={actor.name} />;
}
