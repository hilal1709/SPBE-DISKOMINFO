// Terapkan skema dasar (hanya untuk database kosong) lalu migrasi bertahap di database/migrations/*.sql.
// Jalankan: node database/migrate.mjs
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const root = path.resolve(import.meta.dirname, "..");
const env = Object.fromEntries(
  fs.readFileSync(path.join(root, ".env.local"), "utf8")
    .split(/\r?\n/).filter((line) => line && !line.startsWith("#")).map((line) => line.split(/=(.*)/s).slice(0, 2)),
);
if (!env.DATABASE_URL) throw new Error("DATABASE_URL tidak tersedia");

const client = new pg.Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();

const statements = (file) =>
  fs.readFileSync(file, "utf8").split(/;\s*(?:\r?\n|$)/).map((x) => x.trim()).filter(Boolean);

const { rows: [{ exists }] } = await client.query("select to_regclass('public.opd') is not null as exists");
if (!exists) {
  for (const statement of statements(path.join(import.meta.dirname, "schema.sql"))) await client.query(statement);
  for (const statement of statements(path.join(import.meta.dirname, "seed.sql"))) await client.query(statement);
  console.log("Skema dasar dan seed diterapkan.");
}

await client.query("create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())");
const { rows } = await client.query("select name from schema_migrations");
const applied = new Set(rows.map((r) => r.name));
const dir = path.join(import.meta.dirname, "migrations");

for (const name of fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
  if (applied.has(name)) continue;
  // Satu file = satu transaksi; dikirim utuh agar blok DO $$ … $$ tidak terpotong.
  await client.query("begin");
  try {
    await client.query(fs.readFileSync(path.join(dir, name), "utf8"));
    await client.query("insert into schema_migrations (name) values ($1)", [name]);
    await client.query("commit");
    console.log(`✓ ${name}`);
  } catch (error) {
    await client.query("rollback");
    await client.end();
    throw new Error(`${name}: ${error.message}`);
  }
}

await client.end();
console.log("Migrasi selesai.");
