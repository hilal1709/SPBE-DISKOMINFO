import { auth } from "@/auth";
import { CmsShell, type CmsUser } from "@/components/layout/cms-shell";
import { roleLabel } from "@/lib/roles";

export default async function CmsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const user: CmsUser = session?.user
    ? { name: session.user.name ?? "Pengguna", roleLabel: roleLabel[session.user.role], demo: false }
    : { name: "Admin Diskominfo", roleLabel: "Superadmin (demo)", demo: true };

  return <CmsShell user={user}>{children}</CmsShell>;
}
