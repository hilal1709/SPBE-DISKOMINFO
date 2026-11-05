import type { PoolClient } from "pg";
import type { Actor, ReviewDomain } from "@/lib/permissions";

const targets: Record<ReviewDomain, { table: string; history: string; fk: string }> = {
  probis: { table: "process_businesses", history: "probis_reviews", fk: "process_business_id" },
  layanan: { table: "services", history: "validation_history", fk: "service_id" },
  data: { table: "datasets", history: "validation_history", fk: "dataset_id" },
  aplikasi: { table: "applications", history: "validation_history", fk: "application_id" },
  infrastruktur: { table: "infrastructures", history: "validation_history", fk: "infrastructure_id" },
  keamanan: { table: "security_activities", history: "validation_history", fk: "security_activity_id" },
};

/**
 * Hapus record dan catat log penghapusan dalam satu transaksi (B11). Riwayat lama tetap tersimpan karena FK riwayat
 * ON DELETE SET NULL dan snapshot nama/kode/OPD diisi trigger (migrasi 026).
 */
export async function deleteWithAudit(client: PoolClient, domain: ReviewDomain, id: string, actor: Actor) {
  const t = targets[domain];
  const { rows } = await client.query(`select status::text from ${t.table} where id = $1 for update`, [id]);
  if (!rows[0]) return;
  await client.query(
    `insert into ${t.history} (${t.fk}, actor_id, actor_name, from_status, to_status, note, event) values ($1, $2, $3, $4, $4, 'Dihapus', 'deleted')`,
    [id, actor.id, actor.name, rows[0].status],
  );
  await client.query(`delete from ${t.table} where id = $1`, [id]);
}
