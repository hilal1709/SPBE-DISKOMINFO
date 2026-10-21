# Pengujian keamanan

Kontrol yang sudah terpasang di kode:

| Area | Lokasi |
|---|---|
| Login wajib di production (tanpa bergantung `AUTH_REQUIRED`) | `lib/auth-mode.ts`, `proxy.ts`, `lib/access.ts` |
| Rate limit login (5/akun, 20/IP per 15 menit) + respons waktu sama untuk email tak dikenal | `auth.ts`, `lib/security/rate-limit.ts` |
| Kuota saran AI (30/pengguna/jam) | `assertAiQuota` di `app/cms/**/actions.ts` |
| Header keamanan + CSP | `next.config.ts` |
| Peran & hak akses hanya diatur Superadmin; pengelola akun tak bisa menyentuh akun lebih kuat | `app/cms/pengaturan/actions.ts` |
| Batas zip (1000 entri, 100 MB, 3 tingkat) + cek magic bytes .xlsx/.zip | `lib/security/upload.ts` |
| Galat database tidak dikirim mentah ke peramban | `lib/cms/result.ts` |
| Kanal pelaporan kerentanan (`SECURITY_CONTACT`) | `app/.well-known/security.txt/route.ts` |

Setelah deploy, jalankan migrasi `019_security_hardening.sql` (`pnpm migrate`): tabel `rate_limits` dan penonaktifan akun demo.

## 1. Header (pasif, aman untuk produksi)

```bash
node scripts/security-headers-check.mjs https://spbe-diskominfo.vercel.app
```

Lalu cek manual di https://securityheaders.com/?q=spbe-diskominfo.vercel.app&followRedirects=on (target: A).
`script-src 'unsafe-inline'` sengaja dipertahankan agar halaman publik tetap statis/ter-cache; CSP tetap menutup skrip dari domain lain, `eval`, plugin, dan framing.

## 2. Strix (pentest aktif)

Strix menyerang aplikasi sungguhan (mengirim form, mencoba injeksi, membuat data). **Jangan arahkan ke produksi** kecuali ada izin tertulis dan cadangan database. Celah kode di lokal, preview, dan produksi sama; yang berbeda hanya konfigurasi, jadi uji di **Vercel Preview** yang memakai database uji.

### Persiapan
1. Pasang Docker Desktop (Strix menjalankan sandbox di kontainer) dan Python 3.12+.
2. Pasang Strix: `pipx install strix-agent`
3. Kunci LLM:
   ```bash
   export STRIX_LLM="anthropic/claude-sonnet-5-5"
   export LLM_API_KEY="<kunci API>"
   ```
4. Buat Preview deployment di Vercel dengan env Preview: `DATABASE_URL` ke database uji (bukan produksi), `AUTH_SECRET` berbeda, lalu jalankan migrasi di database uji dan buat satu akun uji per peran.

### Menjalankan
Black-box (dari luar, seperti penyerang):
```bash
strix --target https://<preview>.vercel.app --instruction "Portal SPBE pemerintah. Fokus: bypass autentikasi /cms dan server action, IDOR antar-OPD, eskalasi hak akses di Pengaturan, unggahan .xlsx/.zip berbahaya, CSRF, XSS. Akun uji operator: <email>/<sandi>."
```
White-box (kode + aplikasi berjalan, temuan lebih akurat):
```bash
strix --target ./ --target https://<preview>.vercel.app
```
Hasil tersimpan di `strix_runs/`. Laporkan temuan ke tim, perbaiki, lalu ulangi sampai bersih.

### Produksi
Hanya pemeriksaan pasif (langkah 1). Bila pentest produksi diwajibkan (mis. oleh BSSN/inspektorat), lakukan di jam sepi, dengan cadangan database, dan instruksi Strix yang melarang aksi destruktif.
