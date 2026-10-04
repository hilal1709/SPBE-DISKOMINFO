import { cache } from "react";
import type { PoolClient } from "pg";
import type { Actor } from "@/lib/permissions";
import { getDb } from "@/lib/db";
import { makeRabIndex, type RabIndex, type RabLevel, type RabNode, type RabSet, type RabStatus } from "./rab-index";
import { sampleRabSet } from "./reference";

/**
 * Referensi RAB berversi (server saja). Tiap periode arsitektur memakai satu versi; perubahan nama, kode,
 * induk, atau status dilakukan pada versi draf lalu diterbitkan, sehingga periode lama tidak ikut berubah.
 */

function db() {
  const pool = getDb();
  if (!pool) throw new Error("Database belum dikonfigurasi (DATABASE_URL).");
  return pool;
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

const CODE = /^RAB(\.\d{2}){1,5}$/;

/* ---------- Membaca ---------- */

const NODE_SELECT = `
  select r.id, r.code, r.name, r.level, p.code as parent, r.status, r.version_id
  from rab_references r left join rab_references p on p.id = r.parent_id`;

type NodeRow = { id: string; code: string; name: string; level: RabLevel; parent: string | null; status: RabStatus; version_id: string };
const toNode = (r: NodeRow): RabNode => ({ id: r.id, code: r.code, name: r.name, level: r.level, ...(r.parent && { parent: r.parent }), status: r.status });

/** Versi RAB yang dipakai periode + versi periode aktif (dibaca sekali per request). */
export const loadRabSet = cache(async (): Promise<RabSet> => {
  const periods = await db().query("select name, rab_version_id, coalesce(is_active, false) as active from architecture_periods where rab_version_id is not null");
  if (!periods.rows.length) return sampleRabSet;
  const ids = [...new Set(periods.rows.map((p) => p.rab_version_id as string))];
  const [versions, nodes] = await Promise.all([
    db().query("select id, name from rab_versions where id = any($1)", [ids]),
    db().query<NodeRow>(`${NODE_SELECT} where r.version_id = any($1) order by r.code`, [ids]),
  ]);
  const active = periods.rows.find((p) => p.active) ?? periods.rows.at(-1)!;
  return {
    versions: versions.rows.map((v) => ({ id: v.id, name: v.name, nodes: nodes.rows.filter((n) => n.version_id === v.id).map(toNode) })),
    periodVersion: Object.fromEntries(periods.rows.map((p) => [p.name, p.rab_version_id])),
    activeVersion: active.rab_version_id,
  };
});

/** Seperti `loadRabSet`, tetapi kembali ke referensi bawaan bila database tidak tersedia. */
export async function rabSetSafe(): Promise<RabSet> {
  try {
    return await loadRabSet();
  } catch {
    return sampleRabSet;
  }
}

/** Indeks RAB untuk periode tertentu (atau versi aktif). */
export function rabResolver(set: RabSet) {
  const indexes = new Map(set.versions.map((v) => [v.id, makeRabIndex(v.nodes)]));
  const fallback = indexes.get(set.activeVersion) ?? makeRabIndex([]);
  return (period?: string | null): RabIndex => indexes.get(set.periodVersion[period ?? ""] ?? set.activeVersion) ?? fallback;
}

/* ---------- Pengelolaan versi (CMS › Referensi RAB) ---------- */

export type RabVersionInfo = {
  id: string;
  name: string;
  note: string | null;
  status: "draft" | "published";
  basedOn: string | null;
  periods: string[];
  nodeCount: number;
  createdAt: string;
  publishedAt: string | null;
};

export async function listVersions(): Promise<RabVersionInfo[]> {
  const { rows } = await db().query(
    `select v.id, v.name, v.note, v.status, b.name as based_on, v.created_at, v.published_at,
            (select count(*)::int from rab_references r where r.version_id = v.id) as nodes,
            coalesce((select array_agg(ap.name order by ap.start_year) from architecture_periods ap where ap.rab_version_id = v.id), '{}') as periods
     from rab_versions v left join rab_versions b on b.id = v.based_on
     order by v.created_at`,
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    note: r.note,
    status: r.status,
    basedOn: r.based_on,
    periods: r.periods,
    nodeCount: r.nodes,
    createdAt: r.created_at.toISOString(),
    publishedAt: r.published_at?.toISOString() ?? null,
  }));
}

export type RabManagedNode = RabNode & { id: string; parentId: string | null; probis: number; originCode: string | null };

export async function versionNodes(versionId: string): Promise<RabManagedNode[]> {
  const { rows } = await db().query(
    `select r.id, r.code, r.name, r.level, r.status, r.parent_id, p.code as parent, o.code as origin_code,
            (select count(*)::int from process_businesses pb where pb.rab_id = r.id or pb.rab4_id = r.id or pb.rab5_id = r.id) as probis
     from rab_references r
     left join rab_references p on p.id = r.parent_id
     left join rab_references o on o.id = r.origin_id
     where r.version_id = $1 order by r.code`,
    [versionId],
  );
  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    level: r.level,
    status: r.status,
    parentId: r.parent_id,
    ...(r.parent && { parent: r.parent }),
    probis: r.probis,
    originCode: r.origin_code,
  }));
}

export type RabChange = { id: string; action: string; before: Record<string, unknown> | null; after: Record<string, unknown> | null; actorName: string | null; createdAt: string };

export async function versionChanges(versionId: string): Promise<RabChange[]> {
  const { rows } = await db().query(
    "select id, action, before, after, actor_name, created_at from rab_changes where version_id = $1 order by created_at desc limit 200",
    [versionId],
  );
  return rows.map((r) => ({ id: r.id, action: r.action, before: r.before, after: r.after, actorName: r.actor_name, createdAt: r.created_at.toISOString() }));
}

async function log(client: PoolClient, versionId: string, nodeId: string | null, action: string, before: object | null, after: object | null, actor: Actor) {
  await client.query(
    "insert into rab_changes (version_id, node_id, action, before, after, actor_name) values ($1, $2, $3, $4, $5, $6)",
    [versionId, nodeId, action, before && JSON.stringify(before), after && JSON.stringify(after), actor.name],
  );
}

async function versionOf(client: PoolClient, versionId: string) {
  const { rows } = await client.query("select id, name, status from rab_versions where id = $1", [versionId]);
  if (!rows[0]) throw new Error("Versi RAB tidak ditemukan.");
  return rows[0] as { id: string; name: string; status: "draft" | "published" };
}

/** Salin seluruh pohon versi sumber menjadi versi draf baru; tiap node mencatat asalnya (origin_id). */
export function createVersion(fromId: string, name: string, note: string | null, actor: Actor) {
  return tx(async (client) => {
    const clean = name.trim();
    if (clean.length < 3) throw new Error("Nama versi minimal 3 karakter.");
    await versionOf(client, fromId);
    const { rows } = await client.query(
      "insert into rab_versions (name, note, status, based_on) values ($1, $2, 'draft', $3) returning id",
      [clean, note?.trim() || null, fromId],
    ).catch((error) => {
      if (error.code === "23505") throw new Error(`Nama versi “${clean}” sudah dipakai.`);
      throw error;
    });
    const id = rows[0].id as string;
    await client.query(
      "insert into rab_references (code, name, level, status, version_id, origin_id) select code, name, level, status, $1, id from rab_references where version_id = $2",
      [id, fromId],
    );
    await client.query(
      `update rab_references c set parent_id = np.id
       from rab_references o join rab_references np on np.origin_id = o.parent_id and np.version_id = $1
       where c.version_id = $1 and c.origin_id = o.id`,
      [id],
    );
    await log(client, id, null, "buat_versi", null, { dari: fromId, nama: clean }, actor);
    return id;
  });
}

async function nodeOf(client: PoolClient, id: string) {
  const { rows } = await client.query(
    `select r.id, r.code, r.name, r.level, r.status, r.parent_id, r.version_id, v.status as version_status, p.code as parent_code
     from rab_references r join rab_versions v on v.id = r.version_id left join rab_references p on p.id = r.parent_id where r.id = $1`,
    [id],
  );
  if (!rows[0]) throw new Error("Node RAB tidak ditemukan.");
  return rows[0] as { id: string; code: string; name: string; level: number; status: RabStatus; parent_id: string | null; version_id: string; version_status: string; parent_code: string | null };
}

async function parentInfo(client: PoolClient, versionId: string, parentId: string | null) {
  if (!parentId) return { level: 0, code: null as string | null };
  const { rows } = await client.query("select level, code, version_id from rab_references where id = $1", [parentId]);
  if (!rows[0] || rows[0].version_id !== versionId) throw new Error("Induk harus berada di versi yang sama.");
  return { level: rows[0].level as number, code: rows[0].code as string };
}

/** Peringatan (bukan penghalang) bila kode tidak mengikuti pola induknya. */
function codeWarnings(code: string, level: number, parentCode: string | null) {
  const warnings: string[] = [];
  if (parentCode && !code.startsWith(`${parentCode}.`)) warnings.push(`Kode ${code} tidak diawali kode induk ${parentCode}.`);
  if (code.split(".").length - 1 !== level) warnings.push(`Kode ${code} tidak sesuai Level ${level}.`);
  return warnings;
}

async function assertUniqueCode(client: PoolClient, versionId: string, code: string, exceptId?: string) {
  const { rows } = await client.query("select id from rab_references where version_id = $1 and code = $2 and id <> coalesce($3::uuid, '00000000-0000-0000-0000-000000000000')", [versionId, code, exceptId ?? null]);
  if (rows.length) throw new Error(`Kode ${code} sudah dipakai di versi ini.`);
}

/**
 * Ubah node. Versi terbit hanya boleh koreksi nama; kode/induk diubah lewat versi draf baru.
 * Memindah induk menggeser level node beserta turunannya (maksimal Level 5).
 */
export function updateNode(id: string, patch: { code?: string; name?: string; parentId?: string | null }, actor: Actor) {
  return tx(async (client) => {
    const node = await nodeOf(client, id);
    const published = node.version_status === "published";
    const name = patch.name?.trim();
    const code = patch.code?.trim().toUpperCase();
    const moving = patch.parentId !== undefined && patch.parentId !== node.parent_id;
    if (published && ((code && code !== node.code) || moving)) {
      throw new Error("Versi yang sudah terbit hanya boleh dikoreksi namanya. Buat versi baru untuk mengubah kode atau induk.");
    }
    const warnings: string[] = [];

    if (name !== undefined && name !== node.name) {
      if (name.length < 2) throw new Error("Nama RAB terlalu pendek.");
      await client.query("update rab_references set name = $2 where id = $1", [id, name]);
      await log(client, node.version_id, id, "ubah_nama", { kode: node.code, nama: node.name }, { kode: node.code, nama: name }, actor);
    }

    let level = node.level;
    let parentCode = node.parent_code;
    if (moving) {
      const parentId = patch.parentId ?? null;
      if (parentId === id) throw new Error("Node tidak bisa menjadi induk dirinya sendiri.");
      const descendants = await client.query(
        `with recursive d(id) as (select id from rab_references where parent_id = $1 union select r.id from rab_references r join d on r.parent_id = d.id) select id from d`,
        [id],
      );
      if (parentId && descendants.rows.some((r) => r.id === parentId)) throw new Error("Induk baru tidak boleh turunan node ini.");
      const parent = await parentInfo(client, node.version_id, parentId);
      const delta = parent.level + 1 - node.level;
      const deepest = await client.query("select coalesce(max(level), 0) as m from rab_references where id = any($1)", [descendants.rows.map((r) => r.id)]);
      if (Math.max(node.level, deepest.rows[0].m) + delta > 5) throw new Error("Pemindahan membuat level melebihi Level 5.");
      await client.query("update rab_references set parent_id = $2, level = level + $3 where id = $1", [id, parentId, delta]);
      if (delta) await client.query("update rab_references set level = level + $2 where id = any($1)", [descendants.rows.map((r) => r.id), delta]);
      level = parent.level + 1;
      parentCode = parent.code;
      await log(client, node.version_id, id, "pindah_induk", { kode: node.code, induk: node.parent_code, level: node.level }, { kode: node.code, induk: parent.code, level }, actor);
    }

    if (code && code !== node.code) {
      if (!CODE.test(code)) throw new Error("Format kode harus seperti RAB.09.06.03.");
      await assertUniqueCode(client, node.version_id, code, id);
      await client.query("update rab_references set code = $2 where id = $1", [id, code]);
      await log(client, node.version_id, id, "ubah_kode", { kode: node.code }, { kode: code }, actor);
    }
    warnings.push(...codeWarnings(code ?? node.code, level, parentCode));
    return { warnings };
  });
}

export function addNode(versionId: string, parentId: string | null, code: string, name: string, actor: Actor) {
  return tx(async (client) => {
    const version = await versionOf(client, versionId);
    if (version.status !== "draft") throw new Error("Tambah RAB hanya di versi draf.");
    const clean = code.trim().toUpperCase();
    if (!CODE.test(clean)) throw new Error("Format kode harus seperti RAB.09.06.03.");
    if (name.trim().length < 2) throw new Error("Nama RAB terlalu pendek.");
    const parent = await parentInfo(client, versionId, parentId);
    if (parent.level >= 5) throw new Error("Level 5 adalah level terdalam.");
    await assertUniqueCode(client, versionId, clean);
    const { rows } = await client.query(
      "insert into rab_references (code, name, level, parent_id, version_id) values ($1, $2, $3, $4, $5) returning id",
      [clean, name.trim(), parent.level + 1, parentId, versionId],
    );
    await log(client, versionId, rows[0].id, "tambah", null, { kode: clean, nama: name.trim(), induk: parent.code, level: parent.level + 1 }, actor);
    return { id: rows[0].id as string, warnings: codeWarnings(clean, parent.level + 1, parent.code) };
  });
}

/** Tandai berlaku / tidak berlaku (hanya di versi draf). Node tidak berlaku disembunyikan dari isian baru. */
export function setNodeStatus(id: string, status: RabStatus, actor: Actor) {
  return tx(async (client) => {
    const node = await nodeOf(client, id);
    if (node.version_status !== "draft") throw new Error("Status RAB diubah lewat versi draf baru.");
    if (node.status === status) return;
    await client.query("update rab_references set status = $2 where id = $1", [id, status]);
    await log(client, node.version_id, id, status === "berlaku" ? "aktifkan" : "nonaktif", { kode: node.code, status: node.status }, { kode: node.code, status }, actor);
  });
}

/**
 * Hapus node yang baru ditambahkan di versi draf (mis. salah ketik). Node hasil salinan versi sebelumnya
 * tidak dihapus agar garis keturunan pemetaan tetap utuh — tandai "tidak berlaku" sebagai gantinya.
 */
export function deleteNode(id: string, actor: Actor) {
  return tx(async (client) => {
    const node = await nodeOf(client, id);
    if (node.version_status !== "draft") throw new Error("RAB hanya bisa dihapus di versi draf.");
    const { rows } = await client.query(
      `select r.origin_id,
              exists (select 1 from rab_references c where c.parent_id = r.id) as has_children,
              exists (select 1 from process_businesses pb where pb.rab_id = r.id or pb.rab4_id = r.id or pb.rab5_id = r.id) as used,
              exists (select 1 from rab_references d where d.origin_id = r.id) as has_descendant_versions
       from rab_references r where r.id = $1`,
      [id],
    );
    const info = rows[0];
    if (info.has_children) throw new Error("Hapus atau pindahkan dulu turunannya.");
    if (info.used) throw new Error("RAB ini dipakai probis. Tandai tidak berlaku sebagai gantinya.");
    if (info.origin_id || info.has_descendant_versions) throw new Error("RAB ini berasal dari versi sebelumnya. Tandai tidak berlaku agar pemetaan antarversi tetap utuh.");
    await client.query("delete from rab_references where id = $1", [id]);
    await log(client, node.version_id, null, "hapus", { kode: node.code, nama: node.name, induk: node.parent_code }, null, actor);
  });
}

/** Terbitkan versi draf setelah memeriksa konsistensi hierarki. */
export function publishVersion(id: string, actor: Actor) {
  return tx(async (client) => {
    const version = await versionOf(client, id);
    if (version.status !== "draft") throw new Error("Versi ini sudah terbit.");
    const broken = await client.query(
      `select r.code from rab_references r left join rab_references p on p.id = r.parent_id
       where r.version_id = $1 and ((r.parent_id is null and r.level <> 1) or (p.id is not null and r.level <> p.level + 1))`,
      [id],
    );
    if (broken.rows.length) throw new Error(`Hierarki tidak konsisten: ${broken.rows.slice(0, 5).map((r) => r.code).join(", ")}.`);
    const l3 = await client.query("select count(*)::int as n from rab_references where version_id = $1 and level = 3 and status = 'berlaku'", [id]);
    if (!l3.rows[0].n) throw new Error("Versi harus memiliki minimal satu RAB Level 3 yang berlaku.");
    await client.query("update rab_versions set status = 'published', published_at = now() where id = $1", [id]);
    await log(client, id, null, "terbit", null, { nama: version.name }, actor);
  });
}

export function deleteVersion(id: string) {
  return tx(async (client) => {
    const version = await versionOf(client, id);
    if (version.status !== "draft") throw new Error("Hanya versi draf yang dapat dihapus.");
    const used = await client.query("select count(*)::int as n from architecture_periods where rab_version_id = $1", [id]);
    if (used.rows[0].n) throw new Error("Versi masih dipakai periode.");
    await client.query("update rab_references set origin_id = null where origin_id in (select id from rab_references where version_id = $1)", [id]);
    await client.query("delete from rab_versions where id = $1", [id]);
  });
}

/* ---------- Pindah versi untuk satu periode ---------- */

/**
 * Pindahkan periode ke versi RAB lain dan petakan ulang RAB setiap probisnya melalui garis keturunan
 * node (origin_id), ke depan maupun ke belakang. Probis yang tidak punya padanan berlaku ditandai
 * `rab_review` agar dipetakan ulang secara manual.
 */
export function remapPeriod(periodId: string, versionId: string, actor: Actor) {
  return tx(async (client) => {
    const version = await versionOf(client, versionId);
    if (version.status !== "published") throw new Error("Hanya versi yang sudah terbit yang bisa dipakai periode.");
    const period = (await client.query("select id, name, rab_version_id from architecture_periods where id = $1 for update", [periodId])).rows[0];
    if (!period) throw new Error("Periode tidak ditemukan.");
    if (period.rab_version_id === versionId) return { total: 0, mapped: 0, review: 0 };

    const target = new Map(
      (await client.query("select id, code, level, status, parent_id from rab_references where version_id = $1", [versionId])).rows.map((r) => [r.id as string, r]),
    );
    // Garis keturunan: pasangan (node, leluhur) mengikuti origin_id.
    const lineage = (
      await client.query(
        `with recursive lin(node, anc) as (
           select id, origin_id from rab_references where origin_id is not null
           union select l.node, r.origin_id from lin l join rab_references r on r.id = l.anc where r.origin_id is not null)
         select node, anc from lin`,
      )
    ).rows as { node: string; anc: string }[];
    const forward = new Map<string, string>();
    const backward = new Map<string, string>();
    for (const { node, anc } of lineage) {
      if (target.has(node) && !forward.has(anc)) forward.set(anc, node);
      if (target.has(anc) && !backward.has(node)) backward.set(node, anc);
    }
    const map = (id: string | null) => (id ? (target.has(id) ? id : forward.get(id) ?? backward.get(id) ?? null) : null);

    const probis = (await client.query("select id, rab_id, rab4_id, rab5_id, rab_l4, rab_l5 from process_businesses where period_id = $1", [periodId])).rows;
    const updates = probis.map((p) => {
      const n3 = map(p.rab_id);
      const t3 = n3 ? target.get(n3) : undefined;
      const ok3 = !!t3 && t3.level === 3 && t3.status === "berlaku";
      const n4 = map(p.rab4_id);
      const t4 = n4 ? target.get(n4) : undefined;
      const ok4 = !p.rab4_id || (!!t4 && t4.level === 4 && t4.parent_id === n3 && t4.status === "berlaku");
      const n5 = map(p.rab5_id);
      const t5 = n5 ? target.get(n5) : undefined;
      const ok5 = !p.rab5_id || (!!t5 && t5.level === 5 && t5.parent_id === n4 && t5.status === "berlaku");
      return {
        id: p.id,
        rab: ok3 ? n3 : p.rab_id,
        rab4: p.rab4_id ? (ok4 ? n4 : null) : null,
        rab5: p.rab5_id ? (ok5 ? n5 : null) : null,
        l4: p.rab4_id && ok4 ? t4!.code : p.rab_l4,
        l5: p.rab5_id && ok5 ? t5!.code : p.rab_l5,
        review: !(ok3 && ok4 && ok5),
      };
    });

    for (let i = 0; i < updates.length; i += 1000) {
      const batch = updates.slice(i, i + 1000);
      await client.query(
        `update process_businesses pb set rab_id = u.rab, rab4_id = u.rab4, rab5_id = u.rab5, rab_l4 = u.l4, rab_l5 = u.l5, rab_review = u.review, updated_at = now()
         from unnest($1::uuid[], $2::uuid[], $3::uuid[], $4::uuid[], $5::text[], $6::text[], $7::boolean[]) as u(id, rab, rab4, rab5, l4, l5, review)
         where pb.id = u.id`,
        [batch.map((u) => u.id), batch.map((u) => u.rab), batch.map((u) => u.rab4), batch.map((u) => u.rab5), batch.map((u) => u.l4), batch.map((u) => u.l5), batch.map((u) => u.review)],
      );
    }
    await client.query("update architecture_periods set rab_version_id = $2 where id = $1", [periodId, versionId]);
    const review = updates.filter((u) => u.review).length;
    await log(client, versionId, null, "pakai_periode", null, { periode: period.name, probis: updates.length, perlu_pemetaan: review }, actor);
    return { total: updates.length, mapped: updates.length - review, review };
  });
}

/** Versi terbit terbaru (bawaan untuk periode baru). */
export async function latestPublishedVersion() {
  const { rows } = await db().query("select id from rab_versions where status = 'published' order by published_at desc nulls last limit 1");
  return (rows[0]?.id as string | undefined) ?? null;
}
