import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const root = path.resolve(import.meta.dirname, "..");
const env = Object.fromEntries(
  fs.readFileSync(path.join(root, ".env.local"), "utf8")
    .split(/\r?\n/).filter(Boolean).map((line) => line.split(/=(.*)/s).slice(0, 2)),
);
if (!env.DATABASE_URL) throw new Error("DATABASE_URL tidak tersedia");
const client = new pg.Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
for (const statement of fs.readFileSync(path.join(import.meta.dirname, "schema.sql"), "utf8").split(/;\s*(?:\r?\n|$)/).map((x) => x.trim()).filter(Boolean)) await client.query(statement);
for (const statement of fs.readFileSync(path.join(import.meta.dirname, "seed.sql"), "utf8").split(/;\s*(?:\r?\n|$)/).map((x) => x.trim()).filter(Boolean)) await client.query(statement);
await client.end();
console.log("Supabase schema dan seed berhasil diterapkan.");
