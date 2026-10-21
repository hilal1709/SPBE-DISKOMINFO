# Laporan keamanan — Oktober 2026

Cakupan: audit kode white-box (OWASP Top 10 / ASVS L2) atas server action, route handler, auth & sesi, query SQL, unggahan,
ekspor, AI, realtime, dan konfigurasi. Scan otomatis gratis (CodeQL, Semgrep, Gitleaks, OSV-Scanner, `pnpm audit`, OWASP ZAP
full scan anonim + login, Nuclei, uji otorisasi per peran) berjalan di GitHub Actions lewat `.github/workflows/security-scan.yml`;
hasilnya diunduh dari artefak run dan dicatat di bagian **Hasil scan otomatis**.

Tingkat: **Kritis** (bisa dieksploitasi langsung, dampak penuh) · **Tinggi** · **Sedang** · **Rendah** · **Info**.

## Ringkasan

| Tingkat | Ditemukan | Diperbaiki | Diterima / ditunda |
|---|---|---|---|
| Kritis | 4 | 4 | 0 |
| Tinggi | 1 | 1 | 0 |
| Sedang | 8 | 8 | 0 |
| Rendah | 12 | 9 | 3 |
| Info | 7 | 3 | 4 |

**Wajib saat deploy:** jalankan `pnpm migrate` (migrasi 021 dan 022) **sebelum** kode baru tayang — tanpa tabel `sessions` login ditolak (gagal-tertutup) dan semua sesi lama otomatis berakhir. Bila superadmin produksi masih memakai sandi bawaan, akun itu
ikut dinonaktifkan; buat superadmin baru dengan `pnpm admin:buat <email> "<nama>"` **sebelum** migrasi.

## Temuan

| ID | Tingkat | Judul | Lokasi | Status |
|---|---|---|---|---|
| K-1 | Kritis | Superadmin `admin@gresikkab.go.id` dengan sandi publik (`admin123`, tertulis di halaman login dev) ditanam `seed.sql` di setiap database baru, termasuk produksi | `database/seed.sql`, `database/migrate.mjs` | Diperbaiki |
| K-2 | Kritis | Akun demo dari migrasi 009–014 (walidata@, aplikasi@, infrastruktur@, keamanan@, perencanaan@) memakai hash sandi bersama yang ter-commit dan tetap aktif | `database/migrations/009–014` | Diperbaiki |
| K-3 | Kritis | Impor menerima `status` pilihan klien: operator OPD bisa mengirim `approved` lewat server action dan langsung tayang di portal tanpa verifikasi/validasi | `commit*Import` di `app/cms/**/actions.ts` → `importRows` | Diperbaiki |
| K-4 | Kritis | Impor `update:true` menimpa rekaman berdasar kode saja: lintas OPD, berstatus apa pun (termasuk tervalidasi), dan memindahkan `opd_id` | `importRows` di `lib/*/cms-repo.ts`, `lib/probis/repo.ts` | Diperbaiki |
| T-1 | Tinggi | Keputusan review tidak divalidasi: verifikator mengirim keputusan sembarang (mis. `"x"`) → dianggap "setujui", melompati validasi Diskominfo | `review*` di `app/cms/**/actions.ts` | Diperbaiki |
| S-1 | Sedang | Enumerasi akun lewat waktu respons: hash pembanding biaya 10, hash akun biaya 12 | `auth.ts` | Diperbaiki |
| S-2 | Sedang | Rate limit per IP bisa diakali dengan memalsukan `X-Real-IP`/`X-Forwarded-For` di luar Vercel | `lib/security/rate-limit.ts` | Diperbaiki |
| S-3 | Sedang | Penguncian akun bertarget: 5 sandi salah dari mana pun mengunci pemilik akun 15 menit (DoS) | `auth.ts` | Diperbaiki |
| S-4 | Sedang | Rate limit gagal-terbuka bila tabel `rate_limits` tak bisa dipakai | `lib/security/rate-limit.ts` | Diperbaiki |
| S-5 | Sedang | Saat DB galat, peran diambil dari JWT: akun nonaktif/diturunkan/sandi di-reset tetap bisa bertindak | `lib/access.ts` | Diperbaiki |
| S-7 | Sedang | Sesi JWT murni: logout hanya menghapus cookie; token yang disalin/dicuri tetap sah sampai kedaluwarsa, tanpa idle timeout dan tanpa pencabutan per perangkat | `auth.ts`, `lib/access.ts` | Diperbaiki |
| S-8 | Sedang | Server action tanpa header `Origin` hanya diberi peringatan oleh Next.js (bukan ditolak) | `proxy.ts` | Diperbaiki |
| S-6 | Sedang | Portal publik menampilkan nama/kode probis, layanan, data yang belum tervalidasi lewat tautan dependensi | `lib/{data,layanan,infrastruktur,aplikasi}/repo.ts` | Diperbaiki |
| R-1 | Rendah | Zip bomb: jatah 100 MB direset tiap tingkat zip → satu unggahan bisa mengembang belasan GB | `lib/security/upload.ts` + pemanggil | Diperbaiki |
| R-2 | Rendah | Isian saran AI tanpa batas panjang (biaya Gemini, prompt injection hanya mengubah teks saran) | `suggest*` | Diperbaiki |
| R-3 | Rendah | Race: status dicek di luar transaksi, sunting bisa mendarat di rekaman yang baru saja disetujui | `update*` repo | Diperbaiki |
| R-4 | Rendah | Sesi JWT diperpanjang terus tanpa batas umur absolut | `auth.ts`, `lib/access.ts` | Diperbaiki (8 jam, lihat S-7) |
| R-5 | Rendah | Nomor halaman tanpa batas → galat SQL 500 | `lib/probis/table-params.ts` | Diperbaiki |
| R-6 | Rendah | Selector CSS dari kunci localStorage tidak di-escape (hanya diri sendiri) | `app/layout.tsx` | Diperbaiki |
| R-10 | Rendah | Argumen posisi server action (id, catatan review, status, periode, kunci peran, kode referensi, opsi impor) tanpa skema; nilai rusak baru gagal di database | `app/cms/**/actions.ts` | Diperbaiki |
| R-11 | Rendah | Cookie sesi memakai default Auth.js (tanpa prefiks `__Host-`, bisa ditimpa subdomain) | `auth.ts` | Diperbaiki |
| R-12 | Rendah | Ukuran berkas impor tidak dicek sebelum dibaca ke memori; impor & aksi akun tanpa rate limit | `preview*Import`, `pengaturan/actions.ts` | Diperbaiki |
| R-7 | Rendah | Opsi dependensi & saran AI menampilkan draf OPD lain (nama/kode) | `dependencyOptions` | Diterima: penautan lintas OPD memang dibutuhkan; dibatasi pengguna CMS |
| R-8 | Rendah | TLS ke database tidak memverifikasi sertifikat tanpa `DATABASE_CA` | `lib/db.ts` | Ditunda: isi `DATABASE_CA` (sertifikat root Supabase) di env produksi |
| R-9 | Rendah | CSP memakai `script-src 'unsafe-inline'` | `next.config.ts` | Diterima: keputusan cache halaman publik; CSP tetap menutup skrip domain lain, `eval`, plugin, framing |
| I-1 | Info | Email percobaan login dicetak ke log server | `auth.ts` | Diperbaiki (sudah ada di `auth_events`) |
| I-2 | Info | `/akun` tidak ada di `robots.txt` | `app/robots.ts` | Diperbaiki |
| I-3 | Info | `bodySizeLimit` server action 12 MB berlaku global (dibutuhkan impor) | `next.config.ts` | Diterima; kandidat pindah impor ke route handler |
| I-4 | Info | Tidak ada pemisahan tugas: akun dengan verify + validate bisa memproses ajuannya sendiri | `review*` | Diterima: sesuai desain Superadmin |
| I-5 | Info | `next-auth` versi beta | `package.json` | Pantau advisori |
| I-6 | Info | Paket `cn` tidak dipakai | `package.json` | Kandidat dihapus |
| I-7 | Info | Validasi isian juga di peramban (`required`, `maxLength`, `min/max`, cek sebelum kirim) — bisa dilewati, memberi kesan aman palsu | `components/**` | Diperbaiki: semua validasi hanya di server |

## Perbaikan

- **K-1/K-2** — `seed.sql` tidak lagi membuat akun. Migrasi `021_disable_published_passwords.sql` menonaktifkan, mewajibkan ganti
  sandi, dan mencabut sesi semua akun yang hash sandinya tertulis di repositori (akun yang sudah ganti sandi tidak tersentuh).
  Superadmin dibuat lewat `pnpm admin:buat` (`scripts/create-admin.mts`): sandi sementara acak 16 karakter, wajib diganti.
  README tidak lagi menyebut akun demo.
- **K-3/K-4/R-3** — `lib/cms/guards.ts`: `importStatus` (hanya `draft`/`submitted`), `assertImportUpdate` (impor hanya menimpa
  rekaman yang boleh disunting aktor: OPD sendiri, status draf/dikembalikan, atau `editAny`), `assertStillEditable` (dicek ulang
  pada baris terkunci `for update`). Dipasang di `importRows` dan `update*` keenam domain.
- **T-1** — `reviewTarget(decision, stage)` di `lib/permissions.ts`: hanya `verify`@verifikasi, `validate`@validasi, `reject`.
- **S-1** — hash pembanding dibuat saat start dengan `BCRYPT_COST`.
- **S-2** — `clientIp`: di Vercel memakai `x-vercel-forwarded-for`; di server sendiri header proxy hanya dipercaya bila
  `TRUST_PROXY=true` (reverse proxy wajib menimpa `X-Real-IP`). Tanpa IP tepercaya, batas per IP dilewati (bukan satu ember bersama).
- **S-3** — 5 percobaan per (akun, IP) / 15 menit, 20 per IP / 15 menit, 50 per akun / jam.
- **S-4** — bila tabel tak dapat dipakai, penghitung pindah ke memori proses (tetap membatasi per instance).
- **S-5/R-4** — `actorFor` melempar galat DB (gagal-tertutup); umur sesi kini dari tabel `sessions` (S-7).
- **S-6** — subquery dependensi publik memfilter `status = 'approved'` (`linksSql(true)` untuk aplikasi).
- **S-7** — sesi server-side (migrasi 022, `lib/security/session.ts`). JWT hanya membawa id sesi acak 256-bit; tabel
  `sessions` menyimpan `sha256(id)`. `sessionAccess` memeriksa sesi dalam query akun yang sama (tetap satu round-trip):
  ditolak bila dicabut, lewat 8 jam, tidak aktif 30 menit, atau terbit sebelum sandi diganti. Logout (`events.signOut`),
  ganti/reset sandi, dan nonaktifkan akun mencabut sesi. `/akun/sesi`: daftar perangkat aktif, keluarkan satu atau semua
  perangkat lain. Login gagal-tertutup bila baris sesi tidak bisa dibuat.
- **R-11** — cookie `__Host-spbe.sid` (HTTPS): `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, tanpa `Domain`; CSRF &
  callback Auth.js juga `__Host-`. Di http lokal (`ALLOW_HTTP`/dev) bernama `spbe.sid` tanpa `Secure`.
- **S-8** — `proxy.ts` menolak (403) POST/PUT/DELETE ke `/cms`, `/akun`, `/login`, `/keamanan` bila `Origin` tidak ada,
  `null`, beda host, atau `Sec-Fetch-Site: cross-site`. `allowedOrigins` sengaja kosong (hanya origin sendiri).
- **R-10** — `lib/security/schemas.ts` (`arg`, `idSchema`, `reviewArgs`, `saveOptions`, `importOptions`, `importRows` ≤ 5.000,
  `roleKey`, `refCode/refName`, `yearSchema`). Dipasang di semua server action CMS sebelum menyentuh database. Peran kustom
  divalidasi zod (label 3–60, keterangan ≤ 200).
- **R-12** — `assertUploadFile` (≤ 12 MB, nama ≤ 255) sebelum `arrayBuffer()`; `assertImportQuota` 10/5 menit per pengguna;
  `assertAdminQuota` 30/10 menit untuk aksi pengelolaan akun.
- **I-7** — atribut validasi peramban dan cek sebelum kirim dihapus dari form login, ganti sandi, CMS, peran, akun, periode;
  syarat sandi tampil sebagai teks petunjuk saja. Galat dikembalikan server (`result.fields` / pesan toast).
- **R-1** — `uploadBudget()` dibagi semua tingkat zip dan workbook: total 100 MB, 1000 entri, 50 workbook per unggahan.
- **R-2** — `assertAiInput`: nama ≤ 200, isian lain ≤ 2000 karakter, harus teks.

Uji unit: `pnpm exec tsx --test scripts/security/guards.test.mts` (9/9 lulus). Uji otorisasi aktif per peran:
`scripts/security/authz-probe.mts` (dijalankan workflow ke build produksi + database uji).

## Hasil scan otomatis

Diisi dari artefak run `security-scan` (tab Actions → run terbaru → `security-reports-*`).

| Tool | Hasil (run 1, 2026-10-22) |
|---|---|
| CodeQL + Semgrep | 38 alert. 15 tag action tidak disematkan → **diperbaiki** (SHA commit). 13 hash bcrypt di migrasi/`auth.ts` = K-1/K-2 (dinonaktifkan migrasi 021; hash di `auth.ts` hanya dev). 3 TLS tanpa verifikasi = R-8. Escape tabel Markdown di `authz-probe` → **diperbaiki**. Sisanya false positive: anchor regex header impor (sengaja mencocokkan di tengah), sanitasi `%` di generator data contoh, log galat server, cetak sandi sementara sekali di `admin:buat` (disengaja), tulis laporan di skrip uji. |
| Gitleaks (seluruh riwayat git) | 0 rahasia |
| `pnpm audit --prod` | 0 kerentanan |
| OSV-Scanner | 9 di 4 paket. `brace-expansion` (dev) → **diperbaiki** via override. `braces` (dev: eslint, shadcn CLI) belum ada patch; tidak ikut ke situs. `xlsx` 0.20.3: false positive — GHSA-4r6h (prototype pollution) & GHSA-5pgg (ReDoS) diperbaiki di 0.19.3/0.20.2, GHSA hanya menandai versi npm lama. |
| Rantai pasok (pnpm 11) | `xlsx` dari CDN SheetJS tanpa hash integritas di lockfile → **diperbaiki** (sha512 dicocokkan dengan paket terpasang). Jangan hapus `integrity` itu saat memperbarui lockfile. |
| OWASP ZAP (anonim / login operator), Nuclei, authz-probe | Belum jalan: job DAST berhenti di `pnpm install` karena masalah integritas di atas. |
| Produksi pasif | Header lengkap (6/6 jalur). Mozilla Observatory **B+** (80, 11/12 tes); yang gagal: CSP `unsafe-inline` (R-9). |
