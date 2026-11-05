import { getDb } from "@/lib/db";
import { can, reviewTarget, reviewTeam, stageOf, type Actor, type ReviewDomain } from "@/lib/permissions";
import type { SubmissionStatus } from "@/lib/types";

/** Tabel tiap domain beralur verifikasi (kolom `verified_by` dipakai aturan pemisahan tugas). */
const tables: Record<ReviewDomain, string> = {
  probis: "process_businesses",
  layanan: "services",
  data: "datasets",
  aplikasi: "applications",
  infrastruktur: "infrastructures",
  keamanan: "security_activities",
};

export type Decision = "submit" | "verify" | "validate" | "reject" | "withdraw";

/**
 * Aturan transisi status yang sama untuk semua domain:
 * - Ajukan hanya dari Draf/Dikembalikan (B9/B16), juga untuk Superadmin.
 * - Tarik dari portal: Tervalidasi → Draf, alasan wajib.
 * - Verifikasi hanya dari Diajukan, validasi hanya dari Terverifikasi, oleh akun yang berbeda dari verifikator (B4).
 * - Status tujuan tidak boleh sama dengan status saat ini (B5: klik ganda tidak menambah riwayat).
 */
export async function decide(input: {
  actor: Actor;
  domain: ReviewDomain;
  /** "Probis", "Layanan", "Komponen", … untuk pesan galat. */
  noun: string;
  record: { id: string; status: SubmissionStatus; opdId?: string | null };
  decision: Decision;
  note?: string | null;
}): Promise<{ to: SubmissionStatus; note: string | null }> {
  const { actor, domain, noun, record, decision } = input;
  const from = record.status;
  let note = input.note?.trim() || null;
  let to: SubmissionStatus;

  if (decision === "submit") {
    if (!can.submit(actor, record)) {
      throw new Error(from === "submitted" || from === "verified" ? `${noun} ini sudah diajukan.` : from === "approved" ? `${noun} ini sudah tayang. Tarik dari portal dulu bila perlu diubah.` : `${noun} ini tidak dapat diajukan.`);
    }
    to = "submitted";
  } else if (decision === "withdraw") {
    if (!can.withdraw(actor, record)) throw new Error(`${noun} ini tidak dapat ditarik dari portal.`);
    if (!note) throw new Error("Tuliskan alasan penarikan dari portal.");
    note = `Ditarik dari portal: ${note}`;
    to = "draft";
  } else {
    const stage = stageOf(from);
    if (!stage) throw new Error(`${noun} ini tidak sedang dalam antrean pemeriksaan.`);
    const team = reviewTeam(stage, domain);
    if (!can.review(actor, stage, domain)) throw new Error(`Hanya tim ${team} yang dapat memproses tahap ini.`);
    if (decision === "verify" && stage !== "verifikasi") throw new Error(`${noun} ini sudah melewati tahap verifikasi.`);
    if (decision === "validate" && stage !== "validasi") throw new Error(`${noun} ini belum diverifikasi ${reviewTeam("verifikasi", domain)}.`);
    if (decision === "validate" && (await verifiedBy(domain, record.id)) === actor.id) {
      throw new Error("Validasi harus oleh akun yang berbeda dari verifikator.");
    }
    if (decision === "reject") {
      if (!note) throw new Error("Tuliskan catatan alasan pengembalian.");
      note = `Dikembalikan tim ${team}: ${note}`;
    }
    to = reviewTarget(decision, stage);
  }
  if (to === from) throw new Error(`Status ${noun.toLowerCase()} sudah berubah. Muat ulang halaman.`);
  return { to, note };
}

/** Akun yang memverifikasi record ini (null bila belum/akun dihapus). */
export async function verifiedBy(domain: ReviewDomain, id: string): Promise<string | null> {
  const pool = getDb();
  if (!pool) return null;
  const { rows } = await pool.query(`select verified_by from ${tables[domain]} where id = $1`, [id]);
  return rows[0]?.verified_by ?? null;
}
