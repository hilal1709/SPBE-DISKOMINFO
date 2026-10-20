# Logo Arsitektur SPBE — "Gapura Lapisan"

Lima lapisan arsitektur SPBE (proses bisnis, layanan, data, aplikasi, infrastruktur) bertumpuk menjadi **gapura paduraksa bertingkat**. Pintu di dasarnya membelah dua lapisan terbawah. Gapura adalah gerbang layanan pemerintah sekaligus rujukan gerbang khas Gresik. Lima warnanya adalah lima warna palet Diskominfo.

Presentasi lengkap: [`presentasi/papan.html`](presentasi/papan.html) (slide PNG ada di folder yang sama). Konsep awal (A, B, C): [`konsep-logo.png`](konsep-logo.png).

## Konstruksi

Petak 40 × 40 unit, sudut `rx = 10` (¼ sisi), warna charcoal `#2D2D2F`.

| Lapisan | Warna | Lebar | Keterangan |
| --- | --- | --- | --- |
| 1 (puncak) | Teal `#00A6A6` | 8 | Proses bisnis |
| 2 | Kuning `#EFCA08` | 13 | Layanan |
| 3 | Amber `#F49F0A` | 18 | Data |
| 4 | Oranye `#F08700` | 23 | Aplikasi; dibelah pintu 4,4 |
| 5 (dasar) | Biru muda `#BBDEF0` | 28 | Infrastruktur; dibelah pintu 4,4 |

- Tinggi lapisan 4,4 dan jarak antarlapisan 1,2. Ujungnya membulat penuh. Lebar bertambah 5 unit per lapisan, dan semua lapisan berpusat di x = 20.
- Seluruh tumpukan dinaikkan 0,4 unit dari pusat geometris agar terlihat berada di tengah.
- **Potongan kecil** (`svg/symbol-small.svg`, petak 32) memakai lapisan setinggi 4 dengan jarak 2. Semua tepinya jatuh tepat di piksel pada ukuran 16 dan 32 px. Pakai potongan ini untuk ukuran ≤ 32 px (favicon).
- **Versi terbalik** (`svg/symbol-white.svg`) memakai lapisan 0,2 unit lebih tipis. Tanpa itu, putih di atas latar gelap tampak lebih tebal.
- Geometri di kode: `components/brand/logo-geometry.ts`. Semua master SVG di folder ini dihasilkan oleh `generate.py` (`python generate.py <folder-keluaran>`).

## Berkas

| Berkas | Pakai untuk |
| --- | --- |
| `svg/symbol-color.svg` | Bentuk utama: simbol berpetak charcoal (avatar, ikon aplikasi, kop) |
| `svg/symbol-small.svg` | Ukuran ≤ 32 px |
| `svg/symbol-layers-only.svg` | Lapisan berwarna tanpa petak, hanya di atas latar gelap |
| `svg/symbol-black.svg`, `symbol-charcoal.svg`, `symbol-teal.svg` | Satu warna: cetak, stempel, grafir, faks |
| `svg/symbol-white.svg` | Satu warna putih di atas latar gelap/foto |
| `svg/lockup-horizontal.svg`, `-dark.svg` | Simbol + wordmark mendatar (header, kop surat, spanduk) |
| `svg/lockup-stacked.svg` | Simbol di atas wordmark (sampul, papan nama tegak) |
| `web/` | Favicon (`.ico`, 16/32/48 px), `apple-touch-icon.png`, ikon PWA 192/512 + maskable, `site.webmanifest`, `head-snippet.html` |

Di aplikasi Next.js, ikon dipasang lewat konvensi: `app/favicon.ico`, `app/icon.svg` (potongan kecil), `app/apple-icon.tsx`, `app/manifest.ts`, dan `public/icon-*.png`.

## Aturan pakai

- **Ruang kosong:** di setiap sisi, minimal setinggi dua lapisan beserta jaraknya (≈ ¼ tinggi simbol).
- **Ukuran minimum:** simbol 16 px (gunakan potongan kecil). Lockup mendatar minimal 120 px lebarnya, karena di bawah itu teks "Kabupaten Gresik" tak terbaca.
- **Latar:** simbol berpetak bisa dipakai di latar apa pun. Lapisan tanpa petak hanya untuk latar charcoal atau gelap, karena lapisan biru muda hilang di latar putih. Di atas foto, pakai versi berpetak atau versi putih.
- **Wordmark:** Plus Jakarta Sans ExtraBold (800) untuk "Arsitektur SPBE" dan Medium (500) untuk "Kabupaten Gresik". Lisensinya OFL, jadi boleh dipakai di logo. Di file SVG lockup, teks masih berupa `<text>`. Untuk cetak, ubah dulu menjadi outline (Inkscape: *Path → Object to Path*).

**Jangan:**

- mengubah urutan warna lapisan,
- menutup pintu gapura,
- memiringkan, meregangkan, atau memberi bayangan/gradien,
- menaruh lapisan berwarna tanpa petak di atas latar putih,
- menulis ulang wordmark dengan font lain.

## Uji yang sudah dijalankan

- Audit SVG (`svg_audit.py`): skor 92/100. Satu-satunya peringatan adalah jumlah warna (6). Ini disengaja karena lima lapisan mewakili lima domain, dan versi satu warna tersedia.
- Tangga ukuran 16 / 24 / 32 / 64 px, render piksel 16 px (potongan kecil terbukti lebih tajam), versi satu warna, versi terbalik, dan mockup (situs, tab peramban, ikon aplikasi, papan nama, kartu identitas, kartu nama).
- Nama dan URL di mockup presentasi (mis. "Alex Morgan", "arsitekturspbe.com") hanyalah contoh isian template.
- **Belum dilakukan:** penelusuran merek dagang dan pencarian gambar terbalik. Lakukan keduanya sebelum logo dipakai resmi.
