// Audit baca-saja: jumlah status per periode, tanpa menampilkan isi data atau kredensial.
// node --env-file=.env scripts/features/cms-status-audit.mjs
import { Pool } from "pg";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL belum tersedia.");
const ssl = /sslmode=disable/.test(process.env.DATABASE_URL)
  ? false
  : process.env.DATABASE_CA
    ? { ca: process.env.DATABASE_CA.replace(/\\n/g, "\n"), rejectUnauthorized: true }
    : { rejectUnauthorized: false };
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl, connectionTimeoutMillis: 8000, statement_timeout: 10000, max: 1 });
const tables = ["process_businesses", "services", "datasets", "applications", "infrastructures", "security_activities"];
const client = await pool.connect().catch((error) => {
  console.error("Koneksi audit gagal:", error.code ?? error.name);
  process.exitCode = 1;
});
try {
  if (client) {
    await client.query("begin read only");
    for (const table of tables) {
      const { rows } = await client.query(`
        select ap.name as period, ap.is_active as active, t.status::text, count(*)::int as total
        from ${table} t join architecture_periods ap on ap.id=t.period_id
        group by ap.name, ap.is_active, t.status order by ap.name, t.status`);
      console.log(JSON.stringify({ table, counts: rows }));
    }
  }
} catch (error) {
  console.error("Audit gagal:", error.code ?? error.name);
  process.exitCode = 1;
} finally {
  if (client) {
    await client.query("rollback");
    client.release();
  }
  await pool.end();
}
