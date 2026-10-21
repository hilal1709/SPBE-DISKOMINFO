import type { PoolClient } from "pg";

/**
 * Alat bantu impor massal (server saja). Setiap query ke database memakan ±100 ms, jadi impor ratusan baris
 * harus mengirim sesedikit mungkin query: lookup diingat per nilai, dan baris dikirim dalam satu INSERT.
 */

/** Batas parameter Postgres per statement adalah 65535. */
const MAX_PARAMS = 60_000;

/** INSERT banyak baris sekaligus (dipecah bila parameter melebihi batas). Nilai enum/uuid dikirim sebagai teks dan diubah Postgres. */
export async function insertMany(client: PoolClient, table: string, columns: readonly string[], rows: readonly unknown[][]) {
  const per = Math.max(1, Math.floor(MAX_PARAMS / columns.length));
  for (let start = 0; start < rows.length; start += per) {
    const chunk = rows.slice(start, start + per);
    const params: unknown[] = [];
    const values = chunk.map((row) => `(${row.map((value) => `$${params.push(value)}`).join(",")})`);
    await client.query(`insert into ${table} (${columns.join(", ")}) values ${values.join(",")}`, params);
  }
}

/** Fungsi async yang hasilnya diingat per argumen selama satu impor (OPD, periode, dan referensi yang sama berulang). */
export function memo<A extends unknown[], R>(fn: (...args: A) => Promise<R>) {
  const seen = new Map<string, Promise<R>>();
  return (...args: A) => {
    const key = JSON.stringify(args);
    let hit = seen.get(key);
    if (!hit) seen.set(key, (hit = fn(...args)));
    return hit;
  };
}

/**
 * Konteks satu impor: lookup yang diingat, kode urut di memori, dan baris riwayat/penautan yang dikirim
 * sekaligus di akhir (`flush`), tetap di dalam transaksi yang sama.
 */
export type ImportBatch = ReturnType<typeof importBatch>;

export function importBatch(client: PoolClient, table: string, explicitCodes: readonly string[] = []) {
  const lookups = new Map<string, Promise<{ rows: Record<string, unknown>[] }>>();
  const pending = new Map<string, { table: string; columns: readonly string[]; rows: unknown[][] }>();
  const touched: string[] = [];
  return {
    /**
     * Query baca yang hasilnya tidak berubah selama impor (OPD, periode, referensi, isian domain lain).
     * Jangan dipakai untuk tabel yang sedang diisi impor ini.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    lookup(sql: string, params: unknown[]): Promise<{ rows: any[] }> {
      const key = sql + JSON.stringify(params);
      let hit = lookups.get(key);
      if (!hit) lookups.set(key, (hit = client.query(sql, params)));
      return hit;
    },
    code: codeSequence(client, table, explicitCodes),
    /** Baris yang cukup disisipkan di akhir (mis. riwayat validasi). */
    later(into: string, columns: readonly string[], row: unknown[]) {
      const key = `${into}(${columns.join()})`;
      const group = pending.get(key) ?? { table: into, columns, rows: [] };
      group.rows.push(row);
      pending.set(key, group);
    },
    /** ID isian yang ditulis impor ini, untuk penautan referensi L4/L5 sekaligus. */
    touched,
    async flush(after?: (ids: string[]) => Promise<void>) {
      if (after && touched.length) await after(touched);
      for (const group of pending.values()) await insertMany(client, group.table, group.columns, group.rows);
    },
  };
}

/**
 * Pemberi kode urut per awalan (mis. "GSK-DAB 09.06.03."): kode terbesar dibaca sekali per awalan,
 * lalu kode berikutnya dihitung di memori. Kode eksplisit dari berkas impor ikut dihitung agar tidak bentrok.
 */
export function codeSequence(client: PoolClient, table: string, explicit: readonly string[] = []) {
  const max = new Map<string, number>();
  const top = (prefix: string, codes: string[]) =>
    [...codes, ...explicit].filter((c) => c.startsWith(prefix)).reduce((m, code) => Math.max(m, Number(code.slice(prefix.length)) || 0), 0);
  const load = memo(async (prefix: string) => {
    if (max.has(prefix)) return;
    const { rows } = await client.query(`select code from ${table} where code like $1`, [`${prefix}%`]);
    max.set(prefix, top(prefix, rows.map((r) => String(r.code))));
  });
  const next = async (prefix: string, pad = 2) => {
    await load(prefix);
    const value = (max.get(prefix) ?? 0) + 1;
    max.set(prefix, value);
    return `${prefix}${String(value).padStart(pad, "0")}`;
  };
  /** Baca kode terbesar banyak awalan sekaligus (satu query) sebelum impor dimulai. */
  next.preload = async (prefixes: string[]) => {
    const fresh = [...new Set(prefixes)].filter((p) => !max.has(p));
    if (!fresh.length) return;
    const { rows } = await client.query(`select code from ${table} where code like any($1)`, [fresh.map((p) => `${p}%`)]);
    const codes = rows.map((r) => String(r.code));
    for (const prefix of fresh) max.set(prefix, top(prefix, codes));
  };
  return next;
}
