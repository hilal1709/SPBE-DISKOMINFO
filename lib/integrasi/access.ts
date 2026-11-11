/**
 * Web SPBE dipakai internal (tidak dibuka untuk publik), jadi domain Keamanan tidak dikunci: semua pengunjung portal
 * melihat Keamanan di Ringkasan, Integrasi, dan dashboard /keamanan. Tetap berupa fungsi agar mudah dikunci lagi.
 */
export async function canReadSecurity() {
  return true;
}
