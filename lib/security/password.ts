/** Kebijakan sandi akun CMS. Dipakai server action dan daftar syarat di form (aman untuk klien). */

export const PASSWORD_MIN = 12;
/** bcrypt hanya membaca 72 byte pertama; sisanya diam-diam diabaikan. */
export const PASSWORD_MAX_BYTES = 72;

/** Kata dasar sandi yang mudah ditebak (dibandingkan setelah angka & simbol dibuang). */
const COMMON = new Set([
  "password", "passw", "sandi", "katasandi", "rahasia", "admin", "administrator", "superadmin", "operator", "qwerty", "qwertyuiop",
  "asdfgh", "abcdef", "abcdefgh", "abc", "gresik", "kabgresik", "gresikkab", "diskominfo", "kominfo", "spbe", "indonesia", "welcome", "letmein",
]);

export type PasswordContext = { email?: string | null; name?: string | null };

/** Bagian identitas pengguna (≥4 huruf) yang tidak boleh ada di sandi. */
const identityParts = ({ email, name }: PasswordContext) =>
  [email?.split("@")[0], ...(name?.split(/\s+/) ?? [])].map((part) => part?.toLowerCase().replace(/[^a-z]/g, "") ?? "").filter((part) => part.length >= 4);

export const passwordRules = (ctx: PasswordContext = {}) => [
  { key: "length", label: `Minimal ${PASSWORD_MIN} karakter`, test: (v: string) => v.length >= PASSWORD_MIN },
  { key: "mixed", label: "Memuat huruf dan angka", test: (v: string) => /\p{L}/u.test(v) && /\d/.test(v) },
  {
    key: "personal",
    label: "Tidak memuat nama atau email",
    test: (v: string) => {
      const lower = v.toLowerCase();
      return !identityParts(ctx).some((part) => lower.includes(part));
    },
  },
  { key: "common", label: "Bukan sandi umum", test: (v: string) => v.length > 0 && !COMMON.has(v.toLowerCase().replace(/[^a-z]/g, "")) },
];

/** Pesan galat pertama, atau null bila sandi memenuhi kebijakan. */
export function passwordProblem(value: string, ctx: PasswordContext = {}) {
  if (new TextEncoder().encode(value).length > PASSWORD_MAX_BYTES) return `Sandi terlalu panjang (maksimal ${PASSWORD_MAX_BYTES} byte).`;
  const broken = passwordRules(ctx).find((rule) => !rule.test(value));
  return broken ? `${broken.label}.` : null;
}
