/** Pemrosesan teks ringan bahasa Indonesia untuk saran lokal (tanpa API). */

const stop = new Set(["dan", "atau", "yang", "di", "ke", "dari", "untuk", "pada", "dalam", "serta", "bidang", "urusan", "kegiatan", "proses", "bisnis", "daerah", "kabupaten", "gresik", "dinas", "badan", "berbasis", "elektronik", "sistem"]);

const vowel = /^[aeiou]/;

/**
 * Stemming ringan bahasa Indonesia. Satu kata bisa menghasilkan beberapa bentuk dasar karena peluluhan awalan ambigu
 * ("pengelolaan" → kelola/elola, "ternak" → ternak/nak); kedua sisi (referensi & pertanyaan) memakai fungsi yang sama,
 * jadi cukup satu bentuk yang cocok. Contoh: pengelolaan ≈ kelola, peternakan ≈ ternak, penyusunan ≈ susun.
 */
export function stems(word: string): string[] {
  // Akhiran "-kan" ambigu dengan kata dasar berakhiran "k" + "-an" (peternakan = peternak + an), jadi keduanya dicoba.
  const bases = word.length > 6 ? [...new Set([word.replace(/(kannya|annya|kan|an|nya|i)$/, ""), word.replace(/(annya|an|nya|i)$/, "")])] : [word];
  return [...new Set(bases.flatMap(prefixStems))];
}

function prefixStems(w: string): string[] {
  if (w.length <= 5) return [w];
  const m = w.match(/^(meny|peny|meng|peng|mem|pem|men|pen|me|pe)(.*)$/);
  if (m) {
    const [, prefix, rest] = m as unknown as [string, string, string];
    if (rest.length < 3) return [w];
    const base = prefix.replace(/^m/, "p");
    if (base === "peny") return vowel.test(rest) ? ["s" + rest] : [rest];
    if (base === "peng") return vowel.test(rest) ? ["k" + rest, rest] : [rest];
    if (base === "pem") return vowel.test(rest) ? ["p" + rest, rest] : [rest];
    if (base === "pen") return vowel.test(rest) ? ["t" + rest, rest] : [rest];
    // per- (perencanaan → rencana, pertanian → tani) dan pe-/me- + konsonan (pelayanan, peternakan).
    if (base === "pe" && rest.startsWith("r")) return [rest, rest.slice(1)];
    return [rest];
  }
  // Awalan yang juga bisa bagian kata dasar (ternak, perlu, desa, kelola): simpan bentuk asli dan bentuk tanpa awalan.
  const n = w.match(/^(ber|ter|per|di|ke|se)(.{3,})$/);
  return n ? [w, n[2]!] : [w];
}

/** Bentuk dasar per kata bermakna dalam teks (kata umum dan kata < 3 huruf dibuang). */
export const words = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stop.has(w))
    .map(stems);

/** Semua bentuk dasar dalam teks (untuk indeks referensi). */
export const tokens = (text: string) => words(text).flat();

/**
 * Skor kecocokan pertanyaan terhadap satu entri referensi: tiap kata pertanyaan dihitung sekali (bobot bentuk dasar
 * terbaiknya), kata yang hanya cocok di induk bernilai separuh.
 */
export function matchScore(query: string[][], own: Set<string>, parent: Set<string>, weight: (t: string) => number) {
  let text = 0;
  const hits: string[] = [];
  for (const variants of query) {
    const best = (set: Set<string>) => variants.filter((t) => set.has(t)).sort((a, b) => weight(b) - weight(a))[0];
    const inOwn = best(own);
    const inParent = inOwn ? undefined : best(parent);
    if (inOwn) {
      text += weight(inOwn);
      hits.push(inOwn);
    } else if (inParent) {
      text += weight(inParent) * 0.5;
      hits.push(inParent);
    }
  }
  return { text, hits: [...new Set(hits)] };
}

/**
 * Ambang kecocokan saran lokal (B12): satu kata umum (mis. "kelola") tidak cukup. Saran diterima bila bobot kata yang
 * cocok cukup khas, atau termasuk urusan utama Perangkat Daerah.
 */
export const MIN_TEXT_SCORE = 2.3;
