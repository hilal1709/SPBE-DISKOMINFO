// Akun uji per peran untuk Strix di database uji LOKAL. Sandi acak ditulis ke strix_runs/akun-uji.txt (gitignored).
// Jalankan: DATABASE_URL=postgres://…@localhost:5433/spbe?sslmode=disable tsx scripts/strix/seed-test-users.mts
import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import pg from "pg";

const url = process.env.DATABASE_URL ?? "";
// Pengaman: skrip ini menimpa sandi; tidak boleh menyentuh database selain lokal.
if (!/@(localhost|127\.0\.0\.1)(:\d+)?\//.test(url)) throw new Error("DATABASE_URL harus database uji di localhost.");

const accounts = [
  { email: "uji.superadmin@spbe.test", name: "Uji Superadmin", role: "superadmin", opd: null },
  { email: "uji.admin@spbe.test", name: "Uji Validator Diskominfo", role: "admin", opd: null },
  { email: "uji.organisasi@spbe.test", name: "Uji Bagian Organisasi", role: "organisasi", opd: null },
  { email: "uji.pimpinan@spbe.test", name: "Uji Pimpinan", role: "pimpinan", opd: null },
  { email: "uji.validator.data@spbe.test", name: "Uji Validator Data", role: "validator_data", opd: null },
  { email: "uji.operator.a@spbe.test", name: "Uji Operator Diskominfo", role: "operator_opd", opd: "DISKOMINFO" },
  { email: "uji.operator.b@spbe.test", name: "Uji Operator Dishub", role: "operator_opd", opd: "DISHUB" },
];

const client = new pg.Client({ connectionString: url, ssl: false });
await client.connect();
const lines = ["# Akun uji Strix (database lokal saja)"];
for (const a of accounts) {
  const password = randomBytes(12).toString("base64url");
  await client.query(
    `insert into users (email, name, role, opd_id, password_hash, active, must_change_password)
     values ($1, $2, $3, (select id from opd where code = $4), $5, true, false)
     on conflict (email) do update set password_hash = excluded.password_hash, active = true, must_change_password = false, password_changed_at = null`,
    [a.email, a.name, a.role, a.opd, await bcrypt.hash(password, 10)],
  );
  lines.push(`${a.role}${a.opd ? ` (${a.opd})` : ""}: ${a.email} / ${password}`);
}
await client.end();

const out = path.resolve(import.meta.dirname, "../../strix_runs/akun-uji.txt");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, lines.join("\n") + "\n");
console.log(`${accounts.length} akun uji siap → ${out}`);
