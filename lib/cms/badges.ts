import { cached, TAGS } from "@/lib/cache";
import { getDb } from "@/lib/db";

/** Lencana menu CMS dan banner data contoh: jumlah per status + data contoh tiap domain, dalam satu query (server saja). */
export type BadgeDomain = "probis" | "layanan" | "data" | "aplikasi" | "infrastruktur" | "keamanan" | "rencana" | "gap";
export type CmsBadges = Record<BadgeDomain, { submitted: number; verified: number; samples: number }>;

/** Tabel yang dibatasi OPD pengguna; peta rencana & gap analysis dibaca utuh seperti ringkasannya. */
const scoped: [BadgeDomain, string][] = [
  ["probis", "process_businesses"],
  ["layanan", "services"],
  ["data", "datasets"],
  ["aplikasi", "applications"],
  ["infrastruktur", "infrastructures"],
  ["keamanan", "security_activities"],
];

async function loadBadges(opdId: string | null): Promise<CmsBadges> {
  const pool = getDb();
  if (!pool) throw new Error("Database belum dikonfigurasi (DATABASE_URL).");
  const where = opdId ? "where opd_id = $1" : "";
  const parts = [
    ...scoped.map(
      ([domain, table]) =>
        `select '${domain}', count(*) filter (where status::text = 'submitted')::int, count(*) filter (where status::text = 'verified')::int, count(*) filter (where is_sample)::int from ${table} ${where}`,
    ),
    `select 'rencana', 0, 0, count(*) filter (where is_sample)::int from roadmap_items`,
    `select 'gap', 0, 0, count(*) filter (where is_sample)::int from gap_analyses`,
  ];
  const { rows } = await pool.query<{ domain: BadgeDomain; submitted: number; verified: number; samples: number }>(
    `select domain, submitted, verified, samples from (${parts.join(" union all ")}) b(domain, submitted, verified, samples)`,
    opdId ? [opdId] : [],
  );
  return Object.fromEntries(rows.map(({ domain, ...n }) => [domain, n])) as CmsBadges;
}

export const cmsBadges = cached(loadBadges, "cms:badges", [TAGS.content]);
