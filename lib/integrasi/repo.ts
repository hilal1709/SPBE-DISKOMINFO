import type { Pool, PoolClient } from "pg";
import { getDb } from "@/lib/db";
import { cached, TAGS } from "@/lib/cache";
import type { DomainKey } from "@/lib/domains";
import { packArchitecture, type Architecture, type DomainEdge, type DomainNode, type DomainSummary, type PackedArchitecture, type RelationSummary } from "./model";

import { jenisConfig, type InfraJenis } from "@/lib/infrastruktur/jenis";
import { MASKED_INFRA } from "@/lib/infrastruktur/public";

const NODE_LIMIT = 6000;
const EDGE_LIMIT = 24000;
const tables: [DomainKey, string, string][] = [
  ["probis", "process_businesses", "probis_status::text"], ["layanan", "services", "method"],
  ["data", "datasets", "sifat"], ["aplikasi", "applications", "basis"],
  ["infrastruktur", "infrastructures", "kind"], ["keamanan", "security_activities", "kind"],
];
const junctions = [
  ["service_process_businesses", "service_id", "layanan", "process_business_id", "probis"],
  ["dataset_process_businesses", "dataset_id", "data", "process_business_id", "probis"],
  ["dataset_services", "dataset_id", "data", "service_id", "layanan"],
  ["application_process_businesses", "application_id", "aplikasi", "process_business_id", "probis"],
  ["application_services", "application_id", "aplikasi", "service_id", "layanan"],
  ["application_datasets", "application_id", "aplikasi", "dataset_id", "data"],
  ["infrastructure_links", "infrastructure_id", "infrastruktur", "target_id", "infrastruktur"],
  ["infrastructure_applications", "infrastructure_id", "infrastruktur", "application_id", "aplikasi"],
  ["infrastructure_datasets", "infrastructure_id", "infrastruktur", "dataset_id", "data"],
  ["infrastructure_process_businesses", "infrastructure_id", "infrastruktur", "process_business_id", "probis"],
] as const;

/** Only an allowlist of published metadata crosses the server/client boundary. No attributes or security text. */
async function readArchitecture(securityVisible: boolean, period: string): Promise<Architecture> {
  const db = getDb();
  if (!db) throw new Error("Database belum tersedia.");
  return readArchitectureFromPool(db, securityVisible, period);
}

/**
 * Periode yang dibaca ($1 = '' berarti semua). Semua bacaan memfilter lewat join/subquery ini, bukan dengan mengirim
 * ribuan ID ke server: waktu eksekusi di database hanya puluhan ms, yang mahal adalah ukuran data yang lewat jaringan.
 */
const PERIOD_IDS = "(select id from architecture_periods where $1::text='' or name=$1)";

/** Injectable reader for regression tests; the production caller supplies only getDb(). */
export async function readArchitectureFromPool(db: Pick<Pool, "connect">, securityVisible: boolean, period = ""): Promise<Architecture> {
  const client = await db.connect();
  try {
    await client.query("begin transaction isolation level repeatable read read only");
    const visibleTables = tables.filter(([domain]) => securityVisible || domain !== "keamanan");
    // Nama OPD tidak diulang per baris (dibaca sekali di bawah) agar data yang ditransfer tetap kecil.
    const base = visibleTables.map(([domain, table, category]) =>
      `select '${domain}'::text as domain, t.id::text, t.code, t.name, o.code as opd,
       p.name as period, coalesce(t.${category}, '') as category, t.is_sample as sample
       from ${table} t join opd o on o.id=t.opd_id join architecture_periods p on p.id=t.period_id where t.status='approved'`).join(" union all ");
    const records = await client.query<Omit<DomainNode, "opdName"> & { sample: boolean }>(`select * from (${base}) n where ($2::text='' or period=$2) order by domain, code, id limit $1`, [NODE_LIMIT + 1, period]);
    // Nama OPD mengikuti periode rekaman (opd_periods); kunci "kode|periode", cadangan "kode".
    const opdRows = await client.query<{ code: string; period: string | null; name: string }>(
      "select o.code, null::text as period, o.name from opd o union all select o.code, p.name, op.name from opd_periods op join opd o on o.id=op.opd_id join architecture_periods p on p.id=op.period_id");
    const opdName = new Map(opdRows.rows.map((o) => [o.period ? `${o.code}|${o.period}` : o.code, o.name]));
    const overflow = records.rows.length > NODE_LIMIT;
    // S1: pengunjung umum tidak melihat nama komponen infrastruktur yang memuat rincian teknis (versi OS/DB, VPN, dsb.).
    // S2: nama data tertutup juga tidak tampil bagi pengunjung umum (record tetap dihitung di peta hubungan).
    const publicName = (n: Pick<DomainNode, "domain" | "name" | "code" | "category">) =>
      securityVisible ? n.name
      : n.domain === "infrastruktur" && MASKED_INFRA.has(n.category) ? `${jenisConfig[n.category as InfraJenis].label} ${n.code}`
      : n.domain === "data" && n.category === "tertutup" ? "Data tertutup"
      : n.name;
    const nodes: DomainNode[] = records.rows.slice(0, NODE_LIMIT).map((n) => ({ id: `${n.domain}:${n.id}`, domain: n.domain, code: n.code, name: publicName(n), opd: n.opd, opdName: opdName.get(`${n.opd}|${n.period}`) ?? opdName.get(n.opd) ?? n.opd, period: n.period, category: n.category }));
    const summary = overflow ? await readSummary(client, base, period) : summarize(records.rows, opdName);
    const byId = new Map(nodes.map((n) => [n.id, n]));
    /** Nama asli untuk pencocokan rujukan teks (nama tampilan bisa disamarkan). */
    const rawName = new Map(records.rows.map((n) => [`${n.domain}:${n.id}`, n.name]));
    const edges: DomainEdge[] = [];
    let edgeOverflow = false;
    const add = (source: string, target: string, label: string, storage: DomainEdge["storage"], origin: string) => {
      if (!byId.has(source) || !byId.has(target)) return;
      if (edges.length >= EDGE_LIMIT) { edgeOverflow = true; return; }
      edges.push({ id: `${origin}:${source}:${target}`, source, target, label, storage, origin });
    };
    // Restrict both endpoints in SQL: unpublished or restricted record IDs never become graph edges (add() re-checks).
    const linkSql = junctions.map(([table, from, domain, to, targetDomain], index) => {
      const sourceTable = tables.find(([key]) => key === domain)![1];
      const targetTable = tables.find(([key]) => key === targetDomain)![1];
      return `select ${index}::int as k, j.${from}::text as s, j.${to}::text as t from ${table} j
       join ${sourceTable} s on s.id=j.${from} join ${targetTable} t on t.id=j.${to}
       where s.status='approved' and t.status='approved' and s.period_id in ${PERIOD_IDS} and t.period_id in ${PERIOD_IDS}`;
    }).join(" union all ");
    const links = await client.query<{ k: number; s: string; t: string }>(`${linkSql} limit $2`, [period, EDGE_LIMIT + 1]);
    for (const e of links.rows.slice(0, EDGE_LIMIT)) {
      const [table, , domain, , targetDomain] = junctions[e.k]!;
      add(`${domain}:${e.s}`, `${targetDomain}:${e.t}`, "Relasi tersimpan", "junction", table);
    }
    let partial = overflow || links.rows.length > EDGE_LIMIT;
    const textIndex = new Map<string, DomainNode[]>();
    for (const n of nodes) {
      const key = JSON.stringify([n.domain, n.period, n.domain === "infrastruktur" ? (rawName.get(n.id) ?? n.name).toLowerCase() : n.code]);
      const list = textIndex.get(key) ?? []; list.push(n); textIndex.set(key, list);
    }
    const targets = (domain: DomainKey, period: string, value: string) => textIndex.get(JSON.stringify([domain, period, value])) ?? [];
    const apps = await client.query<{ id: string; cloud: string | null; server: string | null; splp: string | null; jip: string | null; input_data: string | null; output_data: string | null }>(
      `select id::text, cloud, server, splp, jip, input_data, output_data from applications where status='approved' and period_id in ${PERIOD_IDS}`, [period]);
    for (const app of apps.rows) {
      const source = byId.get(`aplikasi:${app.id}`);
      if (!source) continue;
      for (const field of ["cloud", "server", "splp", "jip"] as const) {
        const value = app[field]?.trim().toLowerCase();
        if (!value) continue;
        for (const target of targets("infrastruktur", source.period, value)) add(source.id, target.id, `Referensi ${field}`, "text", `applications.${field}`);
      }
      for (const field of ["input_data", "output_data"] as const) {
        const codes = (app[field] ?? "").split("\n").map((v) => v.trim());
        for (const code of new Set(codes)) for (const target of targets("data", source.period, code)) add(source.id, target.id, field === "input_data" ? "Input data" : "Output data", "text", `applications.${field}`);
      }
    }
    // Authorization is evaluated by the page before this parameter is chosen; anonymous snapshots omit this read entirely.
    if (securityVisible) await addSecurityEdges(client, nodes, period, add);
    if (edgeOverflow) partial = true;
    await client.query("commit");
    return { nodes, edges: edges.slice(0, EDGE_LIMIT), summary, securityVisible, partial, available: true };
  } catch (error) { await client.query("rollback"); throw error; }
  finally { client.release(); }
}

/** Ringkasan per domain/OPD/periode/kategori dari record yang sudah dibaca (tanpa query tambahan). */
function summarize(rows: { domain: DomainKey; opd: string; period: string; category: string; sample: boolean }[], opdName: Map<string, string>): DomainSummary[] {
  const groups = new Map<string, DomainSummary>();
  for (const r of rows) {
    const key = JSON.stringify([r.domain, r.opd, r.period, r.category]);
    const g = groups.get(key);
    if (g) { g.count++; g.sample ||= r.sample; }
    else groups.set(key, { domain: r.domain, opd: r.opd, opdName: opdName.get(`${r.opd}|${r.period}`) ?? opdName.get(r.opd) ?? r.opd, period: r.period, category: r.category, count: 1, sample: r.sample });
  }
  return [...groups.values()];
}

/** Hanya saat record melebihi NODE_LIMIT: ringkasan tetap dihitung penuh di database. */
async function readSummary(client: PoolClient, base: string, period: string): Promise<DomainSummary[]> {
  const { rows } = await client.query<DomainSummary & { opd_name: string }>(
    `select domain, n.opd, coalesce(op.name, o.name) as opd_name, period, category, count(*)::int as count, bool_or(sample) as sample
     from (${base}) n join opd o on o.code=n.opd
     left join architecture_periods np on np.name=n.period left join opd_periods op on op.opd_id=o.id and op.period_id=np.id
     where ($1::text='' or period=$1) group by domain, n.opd, coalesce(op.name, o.name), period, category`, [period]);
  return rows.map((r) => ({ domain: r.domain, opd: r.opd, opdName: r.opd_name, period: r.period, category: r.category, count: r.count, sample: r.sample }));
}

async function addSecurityEdges(client: PoolClient, nodes: DomainNode[], period: string, add: (source: string, target: string, label: string, storage: DomainEdge["storage"], origin: string) => void) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const securityIndex = new Map(nodes.filter((n) => n.domain === "keamanan").map((n) => [JSON.stringify([n.period, n.category, n.code]), n]));
  const sources = tables.filter(([d]) => ["data", "aplikasi", "infrastruktur"].includes(d));
  // Satu statement untuk ketiga domain; hanya record terpublikasi dalam periode yang dibaca.
  const sql = sources.map(([domain, table]) =>
    `select '${domain}'::text as domain, '${table}'::text as tbl, id::text, security from ${table} where status='approved' and period_id in ${PERIOD_IDS} and jsonb_typeof(security)='object' and security <> '{}'::jsonb`).join(" union all ");
  const { rows } = await client.query<{ domain: DomainKey; tbl: string; id: string; security: Record<string, unknown> }>(sql, [period]);
  for (const row of rows) {
    const source = byId.get(`${row.domain}:${row.id}`);
    if (!source) continue;
    for (const [kind, values] of Object.entries(row.security ?? {})) {
      if (!Array.isArray(values)) continue;
      for (const value of new Set(values.filter((v): v is string => typeof v === "string"))) {
        const target = securityIndex.get(JSON.stringify([source.period, kind, value]));
        if (target) add(source.id, target.id, "Referensi keamanan", "jsonb", `${row.tbl}.security.${kind}`);
      }
    }
  }
}

const emptyArchitecture = (securityVisible: boolean): Architecture => ({ nodes: [], edges: [], summary: [], securityVisible, partial: false, available: false });

/**
 * Snapshot ringkas (PackedArchitecture, ±300 KB per periode) disimpan lintas request; graf mentah bisa melewati batas
 * entri 2 MB Next. `securityVisible` ikut menjadi kunci cache sehingga snapshot publik dan internal terpisah.
 * Gagal baca tidak di-cache (error dilempar sebelum unstable_cache menyimpan).
 */
const cachedPacked = cached(async (securityVisible: boolean, period: string) => packArchitecture(await readArchitecture(securityVisible, period)),
  "portal:architecture-packed-v1", [TAGS.content, TAGS.reference]);

/** Internal server loader. Never expose securityVisible as a user-controlled action argument. */
export async function loadPackedArchitecture(securityVisible: boolean, period: string): Promise<PackedArchitecture> {
  try { return await cachedPacked(securityVisible, period); }
  catch { return packArchitecture(emptyArchitecture(securityVisible)); }
}

// Aggregate pages are deliberately small; no record names, attributes or graph payload enter this cache.
const PAGE_SIZE = 100;
const summaryPage = cached(async (domain: DomainKey, offset: number) => {
  const db = getDb(); if (!db) throw new Error("Database belum tersedia.");
  const [, table, category] = tables.find(([key]) => key === domain)!;
  const { rows } = await db.query<DomainSummary>(`select '${domain}'::text as domain, o.code as opd, coalesce(op.name, o.name) as "opdName", p.name as period,
    coalesce(t.${category}, '') as category, count(*)::int as count, bool_or(t.is_sample) as sample
    from ${table} t join opd o on o.id=t.opd_id join architecture_periods p on p.id=t.period_id
    left join opd_periods op on op.opd_id=o.id and op.period_id=t.period_id
    where t.status='approved' group by o.code,coalesce(op.name, o.name),p.name,t.${category}
    order by o.code,p.name,t.${category} limit $1 offset $2`, [PAGE_SIZE, offset]);
  return rows;
}, "portal:summary-page-v2", [TAGS.content, TAGS.reference]);

/** Rujukan teks aplikasi (kolom infrastruktur & kode data) yang juga dihitung sebagai relasi di peta Integrasi. */
const textPairs: Partial<Record<(typeof junctions)[number][0], string>> = {
  infrastructure_applications: `select i.id as infrastructure_id, a.id as application_id from applications a
    join infrastructures i on i.period_id = a.period_id
     and lower(i.name) in (lower(trim(a.cloud)), lower(trim(a.server)), lower(trim(a.splp)), lower(trim(a.jip)))`,
  application_datasets: `select a.id as application_id, d.id as dataset_id from applications a
    cross join lateral regexp_split_to_table(coalesce(a.input_data, '') || E'\n' || coalesce(a.output_data, ''), E'\n') c(code)
    join datasets d on d.period_id = a.period_id and d.code = trim(c.code)`,
};

/** Relasi dalam satu domain tidak termasuk definisi relasi antardomain (lihat RELATION_DEFINITION). */
const crossJunctions = junctions.map((j, index) => ({ j, index })).filter(({ j }) => j[2] !== j[4]);

const relationPage = cached(async (index: number, offset: number) => {
  const db = getDb(); if (!db) throw new Error("Database belum tersedia.");
  const [table, from, source, to, target] = junctions[index];
  const sourceTable = tables.find(([key]) => key === source)![1];
  const targetTable = tables.find(([key]) => key === target)![1];
  // Pasangan unik: tautan tersimpan digabung (union = tanpa duplikat) dengan rujukan teks yang sama dengan peta Integrasi.
  const pairs = textPairs[table] ? `(select ${from}, ${to} from ${table} union ${textPairs[table]})` : table;
  const { rows } = await db.query<RelationSummary>(`select '${source}'::text as source,'${target}'::text as target,
    so.code as "sourceOpd",to_.code as "targetOpd",p.name as period,count(*)::int as count
    from ${pairs} j join ${sourceTable} s on s.id=j.${from} join ${targetTable} t on t.id=j.${to}
    join opd so on so.id=s.opd_id join opd to_ on to_.id=t.opd_id join architecture_periods p on p.id=s.period_id
    where s.status='approved' and t.status='approved' and s.period_id=t.period_id
    group by so.code,to_.code,p.name order by so.code,to_.code,p.name limit $1 offset $2`, [PAGE_SIZE, offset]);
  return rows;
}, "portal:relation-summary-page-v3", [TAGS.content, TAGS.reference]);

type SecuritySource = "data" | "aplikasi" | "infrastruktur";
const securitySources: SecuritySource[] = ["data", "aplikasi", "infrastruktur"];

/** Hanya agregat tautan kode yang sah; teks lama dan isi atribut keamanan tidak dikirim ke browser. */
export async function readSecurityRelationPage(db: Pick<Pool, "query">, source: SecuritySource, offset: number): Promise<RelationSummary[]> {
  const table = tables.find(([key]) => key === source && securitySources.includes(key as SecuritySource))?.[1];
  if (!table) throw new Error("Domain sumber keamanan tidak valid.");
  const { rows } = await db.query<RelationSummary>(`select $1::text as source, 'keamanan'::text as target,
    so.code as "sourceOpd", to_.code as "targetOpd", p.name as period, count(*)::int as count
    from ${table} s
    cross join lateral jsonb_each(case when jsonb_typeof(s.security)='object' then s.security else '{}'::jsonb end) e
    cross join lateral (
      select distinct value #>> '{}' as code
      from jsonb_array_elements(case when jsonb_typeof(e.value)='array' then e.value else '[]'::jsonb end)
      where jsonb_typeof(value)='string'
    ) refs
    join security_activities t on t.code=refs.code and t.kind=e.key and t.period_id=s.period_id and t.status='approved'
    join opd so on so.id=s.opd_id join opd to_ on to_.id=t.opd_id join architecture_periods p on p.id=s.period_id
    where s.status='approved'
    group by so.code, to_.code, p.name order by so.code, to_.code, p.name limit $2 offset $3`, [source, PAGE_SIZE, offset]);
  return rows;
}

const securityRelationPage = cached(async (source: SecuritySource, offset: number) => {
  const db = getDb(); if (!db) throw new Error("Database belum tersedia.");
  return readSecurityRelationPage(db, source, offset);
}, "portal:security-relation-summary-page-v1", [TAGS.content, TAGS.reference]);

async function collect<T>(page: (offset: number) => Promise<T[]>): Promise<T[]> {
  const result: T[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const rows = await page(offset); result.push(...rows);
    if (rows.length < PAGE_SIZE) return result;
  }
}

type OverviewReaders = {
  summary: (domain: DomainKey, offset: number) => Promise<DomainSummary[]>;
  relations: (index: number, offset: number) => Promise<RelationSummary[]>;
  securityRelations: (source: SecuritySource, offset: number) => Promise<RelationSummary[]>;
};

/** Izin diputuskan server sebelum bacaan ber-cache dipanggil; pengunjung umum tidak membaca relasi keamanan. */
export async function readOverviewFromPages(securityVisible: boolean, readers: OverviewReaders) {
  try {
    const [summary, relations, security] = await Promise.all([
      Promise.all(tables.filter(([key]) => securityVisible || key !== "keamanan").map(([key]) => collect((offset) => readers.summary(key, offset)))),
      Promise.all(crossJunctions.map(({ index }) => collect((offset) => readers.relations(index, offset)))),
      securityVisible ? Promise.all(securitySources.map((source) => collect((offset) => readers.securityRelations(source, offset)))) : [],
    ]);
    return { summary: summary.flat(), relations: [...relations.flat(), ...security.flat()], available: true };
  } catch { return { summary: [], relations: [], available: false }; }
}

export async function loadOverview(securityVisible: boolean) {
  return readOverviewFromPages(securityVisible, { summary: summaryPage, relations: relationPage, securityRelations: securityRelationPage });
}
