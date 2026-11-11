import { cached, TAGS } from "@/lib/cache";
import { getDb } from "@/lib/db";
import { defaultMuatan, muatanBook, type MuatanDef } from "./muatan";

/** Master muatan kegiatan Peta Rencana (server saja). Dikelola di CMS › Peta Rencana › Muatan. */

function db() {
  const pool = getDb();
  if (!pool) throw new Error("Database belum dikonfigurasi (DATABASE_URL).");
  return pool;
}

const load = cached(
  async (): Promise<MuatanDef[]> => {
    const { rows } = await db().query("select key, label, abbr, tone from muatan order by sort, label");
    return rows.map((r) => ({ key: r.key, label: r.label, abbr: r.abbr, tone: r.tone }));
  },
  "peta-rencana/muatan:list",
  [TAGS.reference],
);

/** Daftar muatan; bila database/tabel belum tersedia, pakai muatan bawaan. */
export async function listMuatan(): Promise<MuatanDef[]> {
  try {
    const list = await load();
    return list.length ? list : defaultMuatan;
  } catch {
    return defaultMuatan;
  }
}

export const muatanBookSafe = async () => muatanBook(await listMuatan());

/** Jumlah kegiatan per muatan (menentukan boleh tidaknya dihapus). */
export async function muatanUsage(): Promise<Record<string, number>> {
  const { rows } = await db().query("select muatan, count(*)::int as n from roadmap_items group by muatan");
  return Object.fromEntries(rows.map((r) => [r.muatan, r.n]));
}

export async function saveMuatan(v: { key?: string; label: string; abbr: string; tone: string }, newKey: string) {
  const pool = db();
  if (v.key) {
    await pool.query("update muatan set label = $2, abbr = $3, tone = $4 where key = $1", [v.key, v.label, v.abbr, v.tone]);
    return v.key;
  }
  await pool.query("insert into muatan (key, label, abbr, tone, sort) values ($1, $2, $3, $4, (select coalesce(max(sort), 0) + 1 from muatan))", [newKey, v.label, v.abbr, v.tone]);
  return newKey;
}

export async function deleteMuatan(key: string) {
  const { rows } = await db().query("select count(*)::int as n from roadmap_items where muatan = $1", [key]);
  if (rows[0].n) throw new Error(`Muatan masih dipakai ${rows[0].n} kegiatan. Pindahkan kegiatannya dulu.`);
  await db().query("delete from muatan where key = $1", [key]);
}
