# Design System SPBE Gresik

Panduan visual dan teknis untuk seluruh UI portal publik dan CMS. Versi interaktifnya ada di **`/design-system`**.

## Stack

| Kebutuhan | Pakai | Lokasi |
| --- | --- | --- |
| Komponen UI | **shadcn/ui** (style `radix-nova`, Radix UI) | `components/ui/*` |
| Animasi & micro-interaction | **GSAP** + `@gsap/react` (`useGSAP`), ScrollTrigger | `components/motion/*` |
| Ikon | **Hugeicons** (`@hugeicons/core-free-icons`) lewat `<Icon/>` | `components/icon.tsx` |
| Ilustrasi & animasi ilustrasi | **Lottie** (`lottie-react`, build svg) | `components/illustrations/*` |
| Grafik | **Chart.js** + `react-chartjs-2` | `components/charts/*` |
| Referensi pola UI & animasi | **21st.dev** (lihat tabel referensi di bawah) | — |
| Notifikasi | `sonner` via `toast()` | `components/ui/sonner.tsx` |
| Logo & favicon | SVG dari kode | `components/brand/*`, `app/icon.svg`, `app/apple-icon.tsx` |

Tambah komponen shadcn baru dengan `pnpm dlx shadcn@latest add <nama>`. `components.json` sudah memakai `iconLibrary: "hugeicons"`, jadi komponen baru langsung memakai Hugeicons. Setelah menambah komponen, pastikan import `cn` mengarah ke `@/lib/utils`.

## Prinsip

1. **Palet Diskominfo dengan distribusi tetap.** ±60% putih/netral, ±15% biru muda (sidebar, permukaan lembut), ±10% charcoal (teks, aksi utama, nav aktif), ±15% aksen hangat + teal (kartu statistik, grafik, status).
2. **Ikon seperlunya.** Ikon dipakai hanya untuk navigasi, aksi (export, simpan, kirim, keluar), dan fungsi input (cari, tampilkan sandi). **Jangan** pasang ikon dekoratif di kartu statistik, judul section, atau badge.
3. **Ilustrasi, bukan ikon besar.** Keadaan kosong, sukses, error, 404, modul belum siap, dan panel sambutan memakai `<Illustration/>` atau `<EmptyState/>`.
4. **Gerak yang bermakna.** Animasi menjelaskan perubahan (data masuk, item disetujui, langkah form maju). Durasi 0,2–0,6 s, ease `power3.out`. Semua animasi dekoratif mati otomatis saat `prefers-reduced-motion`.
5. **Selalu ada umpan balik loading.** Route punya `loading.tsx`, tombol async memakai prop `loading`, dan link sidebar menampilkan titik berdenyut selama halaman tujuan dimuat (`useLinkStatus`).

## Token

Semua token didefinisikan di `app/globals.css` (`:root` dan `.dark`) dan tersedia sebagai utilitas Tailwind. **Jangan menulis warna hex di komponen.** Satu-satunya pengecualian adalah aset merek (`components/brand/logo-geometry.ts`, `app/icon.svg`).

**Palet merek** (`bg-brand-*`, `text-brand-*`):

| Token | Hex | Peran |
| --- | --- | --- |
| `brand-sky` | `#BBDEF0` | Sidebar (tint), panel login, permukaan lembut, banner info, seri grafik 5 |
| `brand-teal` | `#00A6A6` | Kartu statistik 1, sukses, aksi sekunder, focus ring |
| `brand-yellow` | `#EFCA08` | Kartu statistik 3, seri grafik 1, banner peringatan |
| `brand-amber` | `#F49F0A` | Kartu statistik 4, aksen judul section, Meter |
| `brand-orange` | `#F08700` | Kartu statistik 2, error di toast |
| `brand-charcoal` | `#2D2D2F` | Teks, tombol utama, nav aktif, toast |

**Token semantik:**

| Token | Utilitas | Pemakaian |
| --- | --- | --- |
| `--primary` (charcoal) | `bg-primary text-primary-foreground` | Tombol utama (pil hitam), nav aktif |
| `--sidebar` / `--accent` / `--secondary` | `bg-sidebar`, `bg-accent` | Tint biru muda |
| `--link` `#007A7A` | `text-link` | Tautan teks. Teal murni hanya 3:1 di atas putih, jadi dipakai versi gelap ini |
| `--success` / `--warning` / `--info` / `--destructive` | `text-success bg-success-soft`, dst. | Status. Merah hanya untuk ditolak/error (pengecualian fungsional) |
| `--chart-1..5` | otomatis di Chart.js | Kuning, amber, oranye, teal, biru muda |
| `--shadow-card` / `--shadow-raised` | `shadow-card` / `shadow-raised` | Kartu diam / terangkat |
| `--radius` `0.875rem` | `rounded-lg` dst. | Sudut |

**Kontras (WCAG AA):** teks di atas warna palet selalu charcoal (teal 4.6:1, oranye 5.4:1, amber 6.4:1, kuning 8.6:1, biru muda 9.7:1). Jangan pakai teks putih di atas warna palet selain charcoal.

**Tema CMS** (`[data-theme="cms"]` di `globals.css`). Palet CMS: sage `#EAF2E3`, aqua `#61E8E1`, koral `#F25757`, kuning `#F2E863`, emas `#F2CD60`, charcoal `#2D2D2F`. Keenam warna dipakai; contohnya ada di `/design-system#warna`.

Token `--brand-*` dipetakan ulang sehingga komponen yang sama otomatis berganti warna:

| Token | Portal | CMS |
| --- | --- | --- |
| `brand-sky` (sidebar, permukaan lembut) | `#BBDEF0` | `#EAF2E3` |
| `brand-teal` (kartu statistik 1, sukses) | `#00A6A6` | `#61E8E1` |
| `brand-orange` (kartu statistik 2) | `#F08700` | `#F25757` |
| `brand-yellow` (kartu statistik 3, grafik 1) | `#EFCA08` | `#F2E863` |
| `brand-amber` (kartu statistik 4, aksen) | `#F49F0A` | `#F2CD60` |
| `brand-charcoal` (teks, tombol utama) | `#2D2D2F` | `#2D2D2F` |
| `on-brand` (teks di atas warna palet) | `#2D2D2F` | `#1B1B1D` |

Teks di atas warna palet (kartu statistik, lencana, petak treemap/heat) memakai `text-on-brand`, bukan `text-brand-charcoal`. Di CMS nilainya hampir-hitam `#1B1B1D`, karena charcoal di atas koral hanya 4.1:1 (AA butuh 4.5); dengan `#1B1B1D` menjadi 5.1:1.

`CmsShell` memasang `data-theme="cms"` di wrapper-nya, dan juga di `<html>` lewat `useEffect`. Ini perlu agar modal, sheet, dan toast (yang dirender di luar shell) ikut bertema CMS. Atribut di `<html>` dilepas lagi saat keluar dari CMS. Grafik membaca token dari elemen `[data-theme]`, jadi otomatis ikut. Halaman login tetap memakai palet portal.

**Tipografi:** Plus Jakarta Sans (`--font-jakarta`).
- `.eyebrow`: label 11px kapital.
- `text-2xl font-bold`: judul halaman.
- `.section-title`: judul section dengan aksen amber.
- `text-4xl font-bold`: angka statistik.

## Logo & favicon

Konsep "lapisan arsitektur": lima bar membulat (bisnis, layanan, data, aplikasi, infrastruktur) dalam lima warna palet membentuk huruf **G** di atas petak charcoal.

- `components/brand/logo-geometry.ts` adalah satu-satunya sumber geometri. Setelah mengubahnya, regenerasi favicon dengan `npx tsx -e "import('./components/brand/logo-geometry.ts').then(m=>require('fs').writeFileSync('app/icon.svg', m.logoSvg(40)))"`.
- `<Logo/>` (simbol + wordmark, `tone="dark"` untuk latar charcoal) dan `<LogoMark/>` (simbol saja). Saat hover, lapisan bergeser bertahap (GSAP).
- Favicon `app/icon.svg`; ikon iOS `app/apple-icon.tsx` (ImageResponse 180×180).

## Struktur komponen

```
components/
  ui/            shadcn (disesuaikan: Button.loading + varian teal, Badge success/warning/muted/info,
                 Dialog blur, Toaster charcoal, Alert bergaya banner)
  brand/         Logo, LogoMark, geometri logo
  charts/        Chart.js: BarChart, DoughnutChart, Sparkline, theme.ts
  icon.tsx       <Icon icon={...}/>, pembungkus tunggal Hugeicons
  motion/        GSAP: Reveal, CountUp, Meter, SpotlightCard, PageTransition, gsap.ts
  illustrations/ <Illustration name=.../> + data/*.json (hasil generator)
  loader.tsx     Loader bermerek (Lottie "loader", dengan versi SVG+CSS yang tampil sebelum JS termuat)
  blocks/        Pola tingkat aplikasi: StatCard, FilterBar, MultiSelect, Segmented, Treemap, DataTable, DetailDialog,
                 StatusBadge, HeatTile, PageHeader, EmptyState, DashboardSkeleton, Banner
  layout/        PublicShell, CmsShell, SidebarNav
  dashboards/    Dashboard domain portal publik
  portal/        Halaman portal lain (katalog, pengajuan, verifikasi, …)
  cms/           Halaman CMS
```

Pola filter & tabel dashboard:

- `FilterBar`: filter `multiple` (+ `searchable`) memakai `MultiSelect` (popover + pencarian, "Pilih semua"/"Hapus"). Daftar kosong berarti "Semua". Tombol reset dikirim lewat `actions`.
- `Treemap` (`components/blocks/treemap.tsx`): squarified treemap satu rona teal, petak rapat tanpa celah, klik petak untuk memfilter (`selected` + `onToggle`). Dipakai untuk sebaran RAB 1/RAB 2. `HeatTile` juga menerima `onClick`/`active`/`dimmed` untuk petak lepas.
- `FilterChips`: chip filter aktif di dalam `FilterBar` (children); muncul memantul, menyusut saat dihapus (pola "chip group" 21st.dev).
- Klik-untuk-filter (petak treemap, baris PD) memakai `toast` dengan aksi **Urungkan**.
- `CountUp` bergulir dari nilai sebelumnya saat data berubah; pakai `instant` untuk angka di dalam daftar bergulir.
- Navigasi CMS memakai menu besar (`NavGroup`) berisi sub-menu dengan keterangan satu baris dan lencana angka antrean; grup membuka otomatis bila berisi halaman aktif (GSAP). Keterangan menu aktif juga tampil di header halaman.
- Referensi RAB dibaca dari database per versi: komponen klien memakai `useRab(period)` / `useRabSet()` (`components/probis/rab-context.tsx`), bukan impor JSON statis. RAB *tidak berlaku* disembunyikan dari isian baru dan diberi lencana pada data lama.
- `Segmented` (`components/blocks/segmented.tsx`, shadcn ToggleGroup): pilihan tunggal berbentuk segmen, mis. status probis. Jangan membuat radio/segmen dari `<button>` manual.
- `RabPicker` (`components/blocks/rab-picker.tsx`): pilih RAB Level 3 lewat pencarian; Level 1–2 terisi otomatis (chip hierarki beranimasi). Level 1/2 bisa dipilih dulu untuk mempersempit daftar.
- Panel **Asisten AI** di form CMS: saran ditampilkan per item dengan tombol *Pakai* / *Pakai semua*; kolom yang terisi disorot sebentar (GSAP). Badge sumber: Gemini / Saran lokal.
- Pratinjau impor: kartu hitungan (siap/peringatan/galat), tabel per baris dengan badge *Siap/Cek/Galat* dan catatan, baru disimpan setelah dikonfirmasi.
- `DataTable`: `sortValue` per kolom (header jadi tombol sort), `hideable`/`defaultHidden` (menu "Kolom" — tampilkan hanya info inti secara default), `pageSize` (paginasi), `onRowClick` (baris membuka `DetailDialog`).

Halaman (`app/**/page.tsx`) cukup merangkai komponen. Shell dipasang di layout: `app/(public)/layout.tsx` dan `app/cms/layout.tsx`.

## Animasi (GSAP)

- Selalu impor dari `@/components/motion/gsap`. File itu sudah mendaftarkan `useGSAP` dan `ScrollTrigger` serta menyediakan `MOTION_OK`.
- Bungkus animasi dekoratif dengan `gsap.matchMedia().add(MOTION_OK, …)`.
- Animasi saat render/mount pakai `useGSAP`. Untuk event handler cukup panggil `gsap.to(...)` langsung; jangan pakai `contextSafe` karena dilarang oleh aturan lint React Compiler.
- **Reveal:** bungkus halaman dengan `<Reveal>` dan beri `data-reveal` pada section yang selalu dirender. Section muncul berurutan saat masuk viewport. Elemen yang baru muncul belakangan (hasil filter, tab) jangan diberi `data-reveal`, karena akan tetap tersembunyi.
- Pola micro-interaction (referensi 21st.dev) dan tempat pakainya:

| Pola | Dipakai di |
| --- | --- |
| Spotlight card (sorotan mengikuti kursor + angkat) | `StatCard` |
| Number ticker (`CountUp`) | Angka statistik |
| Sliding highlight | `SidebarNav` |
| Progress grow (`Meter`) | Bar persentase |
| Stepper progress | `ServiceForm` |
| Shake | Login gagal |
| Collapse & slide | Item verifikasi disetujui/dikembalikan |
| Nudge ikon panah saat hover | `group-hover:translate-x-0.5` |
| Press scale | Semua `Button` |

## Grafik (Chart.js)

Impor dari `@/components/charts`: `BarChart`, `DoughnutChart`, `Sparkline`.

- Komponen dimuat hanya di klien (`next/dynamic`) dengan Skeleton sebagai fallback, dan baru dirender saat masuk viewport, sehingga animasinya terlihat.
- Grafik mengisi tinggi induknya, jadi bungkus dengan elemen bertinggi tetap: `<CardContent className="h-64">`.
- Warna seri lewat nama token (`color: "--brand-teal"`). Tanpa warna, dipakai urutan `--chart-1..5`.
- Default global ada di `components/charts/theme.ts`: font Plus Jakarta, grid tipis, tooltip pil charcoal, legend titik bulat. Animasi mati saat `prefers-reduced-motion`.
- `DoughnutChart` menampilkan total di tengah (`caption` untuk keterangannya). `StatCard trend={[…]}` menambahkan sparkline.
- Untuk controller baru (mis. Radar), daftarkan di `theme.ts` dan buat komponen pembungkus di folder yang sama.

## Modal, toast, banner

| Komponen | Gaya | Pakai untuk |
| --- | --- | --- |
| `Dialog` / `DetailDialog` | Overlay charcoal + blur, panel `rounded-2xl`, header & footer sticky, footer tint biru muda, tombol tutup bulat | Detail entri, konfirmasi, dialog sukses (dengan `<Illustration name="success" loop={false}/>`) |
| `toast()` (sonner) | Kartu charcoal, ikon berwarna per tipe (teal sukses, kuning peringatan, oranye error, biru muda info), aksi pil kuning | Umpan balik aksi. Pakai `toast.promise` untuk proses async dan `action: { label: "Urungkan" }` untuk keputusan yang bisa dibatalkan |
| `<Banner/>` | Baris berwarna (info biru muda / warning kuning / success teal), label pil, bisa ditutup dengan animasi collapse | Pengumuman di atas konten (mis. mode demo CMS) |
| `<Alert/>` | Gaya sama dengan banner, tidak bisa ditutup | Pesan di dalam form (mis. login gagal) |

## Referensi 21st.dev

| Referensi | Diterapkan di |
| --- | --- |
| `stats-bold` (@uilayout.contact), `stats-06` (@shadcnui-blocks) | `StatCard` warna solid |
| `stats-card-with-area-chart` (@ephraimduncan) | `StatCard trend` (sparkline) |
| `progressive-blur-modal` (@pate1kiran), `dialog/sticky-header-footer` (@efferd), `mission-success-dialog` (@ravikatiyar162) | `Dialog`, `DetailDialog`, dialog sukses |
| `toast-variants` (@anubra266), `promise-toast` (@cnippet-dev), `undo-pill` (@arihantcodes) | Toaster, `toast.promise`, aksi Urungkan |
| `banner` (@diceui, @dubinc), `announcement/info` (@haydenbleasel) | `<Banner/>` |
| `dashboard-4` (@efferd), `animated-sidebar` (@starc007) | Ritme dashboard, sidebar pastel + sliding highlight |
| Number ticker, spotlight card | `CountUp`, `SpotlightCard` |

## Ilustrasi (Lottie)

Ilustrasi dibuat dari kode, bukan aset unduhan, agar ringan (6–21 KB) dan konsisten dengan palet.

| Nama | Dipakai untuk |
| --- | --- |
| `loader` | Loading route & `<Loader/>` |
| `empty` | Data kosong / hasil pencarian kosong |
| `login-hero` | Panel sambutan login (latar biru muda) |
| `not-found` | Halaman 404 |
| `error` | `error.tsx` |
| `building` | Modul CMS yang belum siap |
| `success` | Pengajuan berhasil (`loop={false}`) |
| `explore` | Kartu sambutan/petunjuk interaksi dashboard |
| `filter-empty` | Hasil filter kosong |

Cara menambah atau mengubah ilustrasi:
1. Edit atau tambah fungsi di `scripts/lottie/build.mjs`. Helper ada di `scripts/lottie/lib.mjs`, dan warna wajib dari `palette` (palet Diskominfo).
2. Jalankan `pnpm illustrations` untuk menghasilkan `components/illustrations/data/*.json`.
3. Daftarkan nama baru di `catalog` pada `components/illustrations/illustration.tsx`, lengkap dengan `ratio` dan frame `still` untuk reduced motion.

`<Illustration/>` memuat JSON secara lazy dan hanya di klien. Saat reduced motion aktif, ilustrasi berhenti di frame `still`. Beri `label` bila ilustrasi menyampaikan informasi; kosongkan bila dekoratif.

## Loading

| Situasi | Pakai |
| --- | --- |
| Pindah route | `loading.tsx` → `<DashboardSkeleton/>` (skeleton + Loader) atau `<Loader/>` |
| Masuk CMS | `app/cms/layout.tsx` membungkus data sesi dengan `<Suspense fallback={<CmsShellSkeleton/>}>`: kerangka CMS (sidebar, header, skeleton) tampil seketika, bukan layar loading kosong |
| Tombol async | `<Button loading={pending}>` |
| Submit form server action | `useActionState` / `useFormStatus` → `loading` |
| Link navigasi | `PendingHint` di `SidebarNav` (`useLinkStatus`) |
| Konten parsial | `<Skeleton/>` |

## Checklist halaman baru

- [ ] Memakai komponen `ui/` dan `blocks/`, bukan elemen HTML bergaya manual.
- [ ] Warna hanya lewat token. Kartu statistik berurutan teal → oranye → kuning → amber.
- [ ] Grafik memakai `@/components/charts`, bukan library lain.
- [ ] Tidak ada teks yang mengulang judul header, judul kartu, atau periode 2025–2029.
- [ ] Ikon hanya untuk navigasi, aksi, atau input.
- [ ] Keadaan kosong, sukses, dan error memakai ilustrasi.
- [ ] Section dibungkus `<Reveal>` + `data-reveal`.
- [ ] Ada `loading` untuk aksi async.
- [ ] Grid berkolom memberi `*:min-w-0` agar konten panjang tidak meluber.
- [ ] Dicek di lebar 375 px (gutter 16 px, tanpa scroll horizontal).
