import type { PoolClient } from "pg";
import { cached, TAGS } from "@/lib/cache";
import { getDb } from "@/lib/db";
import { fallbackDirectory, opdBook, type OpdDirectory } from "./directory";

/** Perangkat Daerah per periode (server saja). */

function db() {
  const pool = getDb();
  if (!pool) throw new Error("Database belum dikonfigurasi (DATABASE_URL).");
  return pool;
}

async function loadDirectory(): Promise<OpdDirectory> {
  const [base, periods] = await Promise.all([
    db().query<{ code: string; name: string; active: boolean }>(
      `select o.code, coalesce(op.name, o.name) as name, coalesce(op.active, o.active, true) as active
       from opd o
       left join opd_periods op on op.opd_id = o.id and op.period_id = (select id from architecture_periods where is_active order by start_year desc limit 1)`,
    ),
    db().query<{ code: string; period: string; name: string; active: boolean }>(
      `select o.code, ap.name as period, op.name, op.active
       from opd_periods op join opd o on o.id = op.opd_id join architecture_periods ap on ap.id = op.period_id`,
    ),
  ]);
  const baseBy = new Map(base.rows.map((o) => [o.code, o]));
  const byPeriod: OpdDirectory["byPeriod"] = {};
  for (const row of periods.rows) {
    const same = baseBy.get(row.code);
    if (same && same.name === row.name && same.active === row.active) continue;
    (byPeriod[row.period] ??= {})[row.code] = [row.name, row.active];
  }
  return { base: base.rows, byPeriod };
}

export const opdDirectory = cached(loadDirectory, "opd/repo:directory", [TAGS.reference]);

/** Direktori OPD; bila database tidak tersedia, pakai daftar contoh. */
export async function opdDirectorySafe(): Promise<OpdDirectory> {
  try {
    const directory = await opdDirectory();
    if (directory.base.length) return directory;
  } catch {
    // Database tidak tersedia: lanjut ke daftar contoh.
  }
  return fallbackDirectory;
}

export const opdBookSafe = async () => opdBook(await opdDirectorySafe());

export type OpdPeriodRow = { id: string; code: string; name: string; active: boolean; /** Jumlah isian OPD ini pada periode tersebut. */ records: number };

const RECORD_TABLES = ["process_businesses", "services", "datasets", "applications", "infrastructures", "security_activities", "roadmap_items"];

export async function listOpdPeriod(periodId: string): Promise<OpdPeriodRow[]> {
  const records = RECORD_TABLES.map((t) => `(select count(*) from ${t} t where t.opd_id = o.id and t.period_id = $1)`).join(" + ");
  const { rows } = await db().query<OpdPeriodRow>(
    `select o.id, o.code, coalesce(op.name, o.name) as name, coalesce(op.active, o.active, true) as active, (${records})::int as records
     from opd o left join opd_periods op on op.opd_id = o.id and op.period_id = $1
     order by coalesce(op.active, o.active, true) desc, 3`,
    [periodId],
  );
  return rows;
}

async function tx<T>(run: (client: PoolClient) => Promise<T>) {
  const client = await db().connect();
  try {
    await client.query("begin");
    const result = await run(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function assertFreeName(client: PoolClient, periodId: string, name: string, opdId: string | null) {
  const { rows } = await client.query(
    "select 1 from opd_periods where period_id = $1 and lower(name) = lower($2) and ($3::uuid is null or opd_id <> $3) limit 1",
    [periodId, name, opdId],
  );
  if (rows.length) throw new Error(`Nama “${name}” sudah dipakai Perangkat Daerah lain pada periode ini.`);
}

/** Ubah nama dan keberlakuan satu OPD pada satu periode. */
export function saveOpdPeriod(periodId: string, opdId: string, name: string, active: boolean) {
  return tx(async (client) => {
    await assertFreeName(client, periodId, name, opdId);
    const { rowCount } = await client.query(
      `insert into opd_periods (opd_id, period_id, name, active)
       select o.id, ap.id, $3, $4 from opd o, architecture_periods ap where o.id = $2 and ap.id = $1
       on conflict (opd_id, period_id) do update set name = excluded.name, active = excluded.active`,
      [periodId, opdId, name, active],
    );
    if (!rowCount) throw new Error("Perangkat Daerah atau periode tidak ditemukan.");
  });
}

/** OPD baru: berlaku pada periode yang dipilih, tidak berlaku pada periode lain (bisa diaktifkan kemudian). */
export function createOpd(periodId: string, code: string, name: string) {
  return tx(async (client) => {
    const taken = await client.query("select code from opd where code = $1 or lower(name) = lower($2)", [code, name]);
    if (taken.rows.length) throw new Error(taken.rows[0].code === code ? `Kode ${code} sudah dipakai.` : `Nama “${name}” sudah terdaftar.`);
    await assertFreeName(client, periodId, name, null);
    const { rows } = await client.query("insert into opd (code, name, active) values ($1, $2, true) returning id", [code, name]);
    const { rowCount } = await client.query(
      "insert into opd_periods (opd_id, period_id, name, active) select $1, ap.id, $2, ap.id = $3 from architecture_periods ap",
      [rows[0].id, name, periodId],
    );
    if (!rowCount) throw new Error("Periode tidak ditemukan.");
    return rows[0].id as string;
  });
}

/** Periode baru mewarisi nama dan keberlakuan OPD dari periode sebelumnya (atau dari tabel opd bila belum ada). */
export async function inheritOpd(client: PoolClient, periodId: string) {
  await client.query(
    `insert into opd_periods (opd_id, period_id, name, active)
     select o.id, $1, coalesce(prev.name, o.name), coalesce(prev.active, o.active, true)
     from opd o
     left join opd_periods prev on prev.opd_id = o.id and prev.period_id = (
       select ap.id from architecture_periods ap
       where ap.id <> $1 and ap.start_year < (select start_year from architecture_periods where id = $1)
       order by ap.start_year desc limit 1)
     on conflict do nothing`,
    [periodId],
  );
}
