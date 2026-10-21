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
| Ganti sandi sendiri (verifikasi sandi lama, 5 percobaan/15 menit, kebijakan ≥12 karakter huruf+angka, bukan nama/email/sandi umum) | `app/actions/akun.ts`, `lib/security/password.ts`, `/akun/sandi` |
| Sandi sementara (akun baru / reset admin) wajib diganti; CMS & server action terkunci sampai diganti | `lib/access.ts`, `app/cms/layout.tsx` |
| Sesi dicabut setelah sandi diganti atau di-reset (`password_changed_at` vs waktu login di JWT) | `auth.ts`, `lib/access.ts` |
| bcrypt biaya 12; hash lama dinaikkan otomatis saat login | `lib/pengguna/repo.ts`, `auth.ts` |
| Jejak audit login berhasil/gagal/terkunci, ganti & reset sandi (tabel `auth_events`) | `lib/security/audit.ts` |

| Impor tidak bisa memilih status tervalidasi atau menimpa rekaman OPD lain / yang sedang ditinjau; sunting dicek ulang di transaksi | `lib/cms/guards.ts` |
| Keputusan review hanya `verify`/`validate`/`reject` sesuai tahap | `reviewTarget` di `lib/permissions.ts` |
| Tidak ada akun bawaan; superadmin dibuat dengan sandi sementara acak (`pnpm admin:buat`) | `scripts/create-admin.mts`, migrasi 021 |
| Sesi maks. 12 jam sejak masuk; galat DB tidak jatuh ke peran di JWT | `lib/access.ts` |

Temuan audit dan statusnya: [`laporan-keamanan.md`](laporan-keamanan.md).

Setelah deploy, jalankan migrasi (`pnpm migrate`): `019_security_hardening.sql` (tabel `rate_limits`, penonaktifan akun demo), `020_password_lifecycle.sql` (wajib ganti sandi, pencabutan sesi, `auth_events`), dan `021_disable_published_passwords.sql` (menonaktifkan semua akun yang sandinya tertulis di repositori — buat superadmin baru dengan `pnpm admin:buat` lebih dulu bila perlu). Tanpa 020, pencabutan sesi dan wajib ganti sandi tidak berlaku dan ganti sandi gagal. Di server sendiri (bukan Vercel) di belakang reverse proxy, set `TRUST_PROXY=true`.

## 0. Scan otomatis gratis di GitHub Actions (disarankan)

`.github/workflows/security-scan.yml` berjalan di runner GitHub (tidak memakai kuota/CPU laptop, tidak menyentuh database produksi): CodeQL, Semgrep, Gitleaks, OSV-Scanner + `pnpm audit`, lalu build produksi + Postgres sekali pakai untuk uji otorisasi per peran (`scripts/security/authz-probe.mts`), OWASP ZAP full scan (anonim dan login operator), dan Nuclei. Produksi hanya dicek pasif (header, Mozilla Observatory).

Jalankan dari tab **Actions → security-scan → Run workflow** (atau `gh workflow run security-scan`); otomatis tiap Senin 02.00 WIB. Laporan: artefak `security-reports-*` di halaman run, temuan CodeQL/Semgrep di tab **Security → Code scanning**.

Audit login terbaru:
```sql
select created_at, event, email, ip from auth_events order by created_at desc limit 50;
```

## 1. Header (pasif, aman untuk produksi)

```bash
node scripts/security-headers-check.mjs https://spbe-diskominfo.vercel.app
```

Lalu cek manual di https://securityheaders.com/?q=spbe-diskominfo.vercel.app&followRedirects=on (target: A).
`script-src 'unsafe-inline'` sengaja dipertahankan agar halaman publik tetap statis/ter-cache; CSP tetap menutup skrip dari domain lain, `eval`, plugin, dan framing.

## 2. Strix (pentest aktif)

Strix menyerang aplikasi sungguhan (mengirim form, mencoba injeksi, membuat data). **Jangan arahkan ke produksi** kecuali ada izin tertulis dan cadangan database. Celah kode di lokal, preview, dan produksi sama; yang berbeda hanya konfigurasi, jadi uji di **Vercel Preview** yang memakai database uji.

### Uji lokal (disarankan, terisolasi)
Tumpukan uji di mesin sendiri: Postgres di Docker + build produksi di `http://localhost:3100`. Tidak menyentuh database di `.env.local`; kunci Gemini/Pusher dimatikan; Strix hanya menerima salinan berkas git (tanpa `.env*`).

1. Docker Desktop berjalan (Windows: fitur "Virtual Machine Platform" + WSL2 aktif, virtualisasi aktif di BIOS).
2. Strix: `uv tool install strix-agent` (biner di `%USERPROFILE%\.localin`).
3. Kunci LLM di `.env.strix` (gitignored) atau env pengguna:
   ```
   STRIX_LLM=anthropic/claude-sonnet-5-5
   LLM_API_KEY=<kunci API>
   ```
4. Jalankan:
   ```powershell
   ./scripts/strix/test-db.ps1                    # Postgres uji + migrasi + akun uji per peran → strix_runs/akun-uji.txt
   ./scripts/strix/run.ps1 -Mode standard -MaxBudget 20
   ```
   Hasil di `strix_runs/<nama-run>/`. Hapus database uji: `docker rm -f spbe-strix-db`.

### Persiapan Preview
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
