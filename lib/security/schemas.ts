import { z } from "zod";

/**
 * Skema argumen server action selain isian form (id, keputusan review, opsi simpan/impor). Server action bisa dipanggil
 * langsung dengan argumen apa pun — tipe TypeScript tidak berlaku saat runtime — jadi semuanya diperiksa di sini sebelum
 * menyentuh database. Validasi isian hanya di server; peramban tidak memeriksa apa pun.
 */

const INVALID = "Data tidak valid.";

/** Semua id baris domain adalah uuid (gen_random_uuid). `guid` menerima id seed berpola apa pun selama formatnya uuid. */
export const idSchema = z.guid(INVALID);
export const optionalId = idSchema.optional();

export const noteSchema = z.string(INVALID).trim().max(1000, "Catatan maksimal 1.000 karakter.");

export const reviewArgs = z.object({
  id: idSchema,
  decision: z.enum(["submit", "verify", "validate", "reject"], INVALID),
  note: noteSchema.optional(),
});

export const saveOptions = z.object({ id: optionalId, submit: z.boolean(INVALID) });
export const editOptions = z.object({ id: optionalId });
export const importOptions = z.object({ status: z.enum(["draft", "submitted"], INVALID), update: z.boolean(INVALID) });
export const updateOption = z.object({ update: z.boolean(INVALID) });

/** Baris impor dikirim ulang dari peramban: jumlahnya dibatasi, isinya divalidasi ulang oleh validateRows + skema domain. */
export const importRows = z.array(z.record(z.string(), z.unknown()), INVALID).max(5000, "Maksimal 5.000 baris per impor.");

/** Kode OPD dan nama periode ("2025–2029") untuk daftar pilihan. */
export const opdCode = z.string(INVALID).trim().max(40, INVALID);
export const periodName = z.string(INVALID).trim().max(20, INVALID);

export const yearSchema = z.number(INVALID).int(INVALID).min(2000, "Tahun tidak valid.").max(2100, "Tahun tidak valid.");

/** Kunci peran: bawaan (superadmin, …) atau kustom (custom_xxx). */
export const roleKey = z.string(INVALID).regex(/^[a-z][a-z0-9_-]{1,63}$/, INVALID);

export const refCode = z.string(INVALID).trim().min(1, "Kode wajib diisi.").max(40, "Kode maksimal 40 karakter.");
export const refName = z.string(INVALID).trim().min(2, "Nama minimal 2 karakter.").max(300, "Nama maksimal 300 karakter.");

/**
 * Validasi argumen; gagal → Error biasa berisi pesan yang aman ditampilkan (ZodError disembunyikan `fail()` sebagai galat
 * internal, jadi diubah di sini).
 */
export function arg<T extends z.ZodType>(schema: T, value: unknown): z.output<T> {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? INVALID);
  return parsed.data;
}

/** Versi tanpa lempar untuk fungsi baca yang mengembalikan nilai kosong saat argumen tidak valid. */
export const isValid = (schema: z.ZodType, value: unknown) => schema.safeParse(value).success;
