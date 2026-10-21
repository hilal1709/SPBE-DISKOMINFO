import { EmptyState } from "@/components/blocks/empty-state";
import { NoAccess } from "@/components/cms/no-access";
import { AccessMatrix } from "@/components/cms/pengguna/access-matrix";
import { Card } from "@/components/ui/card";
import { can, currentActor } from "@/lib/access";
import { getDb } from "@/lib/db";
import { listGrants } from "@/lib/pengguna/grants";
import { listUsers } from "@/lib/pengguna/repo";

export default async function AccessPage() {
  const actor = await currentActor();
  if (!can.manageUsers(actor)) return <NoAccess title="Halaman ini untuk Superadmin" />;
  if (!getDb())
    return (
      <Card>
        <EmptyState illustration="error" title="Database belum terhubung" description="Hak akses disimpan di database. Atur DATABASE_URL lalu jalankan pnpm migrate." />
      </Card>
    );
  const [grants, users] = await Promise.all([listGrants(), listUsers()]);
  const counts: Record<string, number> = {};
  for (const u of users) if (u.active) counts[u.role] = (counts[u.role] ?? 0) + 1;
  return <AccessMatrix grants={grants} users={counts} />;
}
