/** Pemrosesan teks ringan bahasa Indonesia untuk saran lokal (tanpa API). */

const stop = new Set(["dan", "atau", "yang", "di", "ke", "dari", "untuk", "pada", "dalam", "serta", "bidang", "urusan", "kegiatan", "proses", "bisnis", "daerah", "kabupaten", "gresik", "dinas", "badan", "berbasis", "elektronik", "sistem"]);

/** Stemming ringan bahasa Indonesia: buang imbuhan umum agar "pengelolaan" ≈ "kelola". */
function stem(word: string) {
  let w = word;
  if (w.length > 6) w = w.replace(/(kannya|annya|kan|an|nya|i)$/, "");
  if (w.length > 5) w = w.replace(/^(meng|mem|men|meny|peng|pem|pen|peny|ber|ter|per|di|ke|se|me|pe)/, "");
  return w;
}

export const tokens = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stop.has(w))
    .map(stem);
