/**
 * Kode yang sudah pernah dipakai di tabel ini: record aktif ditambah kode record yang telah dihapus (tabel retired_codes,
 * diisi trigger migrasi 027). Pemberi kode menghitung urutan berikutnya dari daftar ini, sehingga nomor tidak dipakai ulang (B19).
 * `$1` = pola LIKE (atau array pola bila `many`). `table` selalu nama tabel tetap dari kode, bukan masukan pengguna.
 */
export function usedCodesSql(table: string, many = false) {
  const op = many ? "like any($1)" : "like $1";
  return `select code from ${table} where code ${op}
          union all select code from retired_codes where table_name = '${table}' and code ${op}`;
}
