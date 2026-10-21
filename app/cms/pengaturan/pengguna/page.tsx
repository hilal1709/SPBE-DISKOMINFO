import { EmptyState } from "@/components/blocks/empty-state";
import { NoAccess } from "@/components/cms/no-access";
import { UserManager } from "@/components/cms/pengguna/user-manager";
import { Card } from "@/components/ui/card";
import { can, currentActor } from "@/lib/access";
import { getDb } from "@/lib/db";
import { listRoles } from "@/lib/pengguna/grants";
import { listOpd, listUsers } from "@/lib/pengguna/repo";

export default async function UsersPage() {
  const actor = await currentActor();
  if (!can.manageUsers(actor)) return <NoAccess title="Halaman ini untuk Superadmin" />;
  if (!getDb())
    return (
      <Card>
        <EmptyState illustration="error" title="Database belum terhubung" description="Akun disimpan di database. Atur DATABASE_URL lalu jalankan pnpm migrate." />
      </Card>
    );
  const [users, opds, roles] = await Promise.all([listUsers(), listOpd(), listRoles()]);
  return <UserManager users={users} opds={opds} roles={roles} selfId={actor.id} />;
}
