# Panduan Ringkasan, Input Data, dan Integrasi Sistem SPBE

Versi 1.0 — 30 Oktober 2026

Dokumen ini menggabungkan penjelasan fitur dan buku panduan pengguna untuk halaman Ringkasan, pembaruan input data CMS, serta Integrasi Sistem/Domain SPBE. Nama tombol dan perilaku mengacu pada implementasi proyek saat dokumen disusun. Contoh nama, kode, dan angka bersifat ilustratif.

## Daftar isi

1. [Tujuan dan istilah](#1-tujuan-dan-istilah)
2. [Halaman dan akses](#2-halaman-dan-akses)
3. [Buku panduan halaman Ringkasan](#3-buku-panduan-halaman-ringkasan)
4. [Buku panduan input dan pembaruan data](#4-buku-panduan-input-dan-pembaruan-data)
5. [Konsep Integrasi Sistem](#5-konsep-integrasi-sistem)
6. [Buku panduan Integrasi Sistem](#6-buku-panduan-integrasi-sistem)
7. [Cara membaca simulasi perubahan dan penghapusan](#7-cara-membaca-simulasi-perubahan-dan-penghapusan)
8. [Contoh penggunaan dari awal sampai akhir](#8-contoh-penggunaan-dari-awal-sampai-akhir)
9. [Pemecahan masalah](#9-pemecahan-masalah)
10. [Batasan dan catatan pengelolaan](#10-batasan-dan-catatan-pengelolaan)
11. [Rujukan implementasi](#11-rujukan-implementasi)

## 1. Tujuan dan istilah

Portal membantu pengelola melihat inventaris arsitektur SPBE, memperbarui pencatatannya, dan menelusuri hubungan antarrecord. Enam domainnya adalah Proses Bisnis, Layanan, Data, Aplikasi, Infrastruktur, dan Keamanan.

Fitur Integrasi pada dokumen ini adalah **peta keterkaitan pencatatan arsitektur**, bukan integrasi API, pemantauan jaringan, pengujian koneksi server, atau pengukuran kondisi aplikasi secara langsung.

Contohnya, menghapus record “Cloud Pemkab” dari pendataan tidak berarti mematikan cloud yang sesungguhnya. Yang dibahas oleh simulasi adalah hubungan dan referensi di dalam inventaris SPBE.

| Istilah | Pengertian |
| --- | --- |
| Record | Satu entri inventaris, misalnya satu aplikasi atau satu dataset. |
| Domain | Kelompok arsitektur tempat record berada. |
| OPD/Perangkat Daerah | Unit pemilik record. |
| Periode | Periode arsitektur yang dipilih pada filter atau formulir. |
| Tervalidasi | Record berstatus akhir `approved`, sehingga dapat masuk cakupan portal sesuai hak akses. |
| Relasi/tautan langsung | Hubungan antar-ID record yang dicatat melalui tabel penghubung. |
| Referensi kode/nama | Isian yang dicocokkan dengan kode atau nama record lain. |
| Referensi keamanan | Rujukan kode kegiatan keamanan yang disimpan dalam struktur JSONB. |
| Cakupan | Data yang sedang tersedia menurut periode, OPD, hak akses, dan batas pemuatan. |
| Simulasi | Pembacaan hubungan untuk membantu pemeriksaan; tidak menjalankan perubahan atau penghapusan. |

## 2. Halaman dan akses

| Halaman | Alamat | Fungsi |
| --- | --- | --- |
| Ringkasan | `/` | Rekap inventaris, komposisi, peringkat OPD, dan hubungan domain. |
| Integrasi | `/integrasi` | Peta domain, pemilihan record, hubungan langsung, dan simulasi keterkaitan. |
| Input Proses Bisnis | `/cms/proses-bisnis/baru` | Cari data lama atau isi record baru. |
| Input Layanan | `/cms/layanan/baru` | Cari data lama atau isi record baru. |
| Input Data | `/cms/data/baru` | Cari data lama atau isi record baru. |
| Input Aplikasi | `/cms/aplikasi/baru` | Cari data lama atau isi record baru. |
| Input Infrastruktur | `/cms/infrastruktur/baru` | Cari data lama atau isi record baru. |
| Input Keamanan | `/cms/keamanan/baru` | Cari data lama atau isi record baru. |

CMS memerlukan akun dan izin yang sesuai. Halaman input baru memeriksa izin tambah data. Pencarian data lama di dalamnya juga memeriksa izin edit, cakupan OPD, dan status record. Pengguna yang hanya berhak mengedit dapat menggunakan halaman daftar/edit sesuai menu yang diizinkan.

Ringkasan dan Integrasi hanya memuat inventaris tervalidasi dalam cakupannya. Domain Keamanan memerlukan sesi login yang valid dan izin melihat Dashboard Keamanan; pengguna yang masih wajib mengganti sandi sementara belum memenuhi pemeriksaan akses tersebut. Tanpa akses itu, kegiatan dan referensi Keamanan tidak disertakan. Identitas serta hubungan tervalidasi Infrastruktur tetap dapat tampil, dengan rincian sensitif tidak dimuat ke peta publik.

## 3. Buku panduan halaman Ringkasan

### 3.1 Membuka dan mengatur cakupan

1. Buka halaman Ringkasan di `/`.
2. Pilih **Periode** yang ingin diperiksa.
3. Pada **Perangkat Daerah**, pilih satu atau beberapa OPD. Pilihan kosong berarti semua OPD yang tersedia dalam ringkasan.
4. Periksa chip filter aktif. Hapus chip untuk melepas filter terkait.
5. Gunakan **Reset filter** untuk kembali ke periode aktif dan seluruh OPD.

Filter berlaku pada statistik dan visual yang ditampilkan. Ketika membuka dashboard domain dari Ringkasan, periode dan OPD pilihan ikut dikirim melalui alamat halaman.

### 3.2 Kartu jumlah inventaris

Setiap kartu domain menunjukkan jumlah record tervalidasi sesuai filter. Klik kartu untuk membuka dashboard domain tersebut.

Angka kartu adalah jumlah record, bukan jumlah hubungan dan bukan nilai kematangan SPBE. Jika tidak memiliki akses Keamanan, tampil penjelasan akses, bukan angka nol yang dapat disalahartikan sebagai tidak ada inventaris.

### 3.3 Inventaris per Domain

Grafik cincin menunjukkan porsi setiap domain terhadap total inventaris yang dapat dilihat dalam filter.

Contoh: ada 100 record yang dapat dilihat dan 25 di antaranya Aplikasi. Porsi Aplikasi adalah 25%. Persentase ini bukan tingkat integrasi, tingkat kelengkapan, atau kualitas aplikasi.

Klik cincin atau legenda untuk membuka dashboard domain terkait dengan periode dan OPD yang sama.

### 3.4 Perangkat Daerah Terbanyak

Peringkat disusun dari jumlah record lintas domain per OPD dalam cakupan ringkasan. Pilihan **Top 5**, **Top 10**, dan **Semua** mengatur banyaknya OPD yang ditampilkan.

Klik baris OPD untuk mengganti filter Perangkat Daerah menjadi OPD tersebut. Gunakan chip atau Reset filter untuk kembali ke cakupan lebih luas.

Panjang batang dibandingkan dengan OPD terbanyak dalam hasil filter. Peringkat ini tidak otomatis berarti kinerja atau kualitas pendataan OPD lebih baik.

### 3.5 Komposisi layanan, data, dan aplikasi

Tiga panel komposisi menampilkan:

| Panel | Pengelompokan |
| --- | --- |
| Metode layanan | Jumlah layanan menurut metode. |
| Sifat data | Jumlah dataset menurut sifat data. |
| Basis aplikasi | Jumlah aplikasi menurut basis aplikasi. |

Persentase dihitung terhadap total record pada panel tersebut. Klik bagian grafik atau baris kategorinya untuk membuka dashboard domain dengan filter kategori yang sesuai.

### 3.6 Hubungan domain

Visual aliran/Sankey merangkum jumlah tautan langsung antarrecord tervalidasi pada periode yang sama.

- Kolom kiri menunjukkan domain asal dan kolom kanan menunjukkan domain terkait.
- Ketebalan aliran sebanding dengan jumlah tautan.
- Dua kolom adalah dua ujung hubungan, bukan dua tahap proses atau beberapa lompatan ketergantungan.
- Klik aliran untuk membuka Integrasi dengan filter pencarian domain asal.
- Tombol **Buka Integrasi Domain** membuka halaman Integrasi dengan periode dan OPD yang dipilih.

**Ringkasan hubungan hanya menghitung tautan langsung dari tabel penghubung.** Referensi kode/nama dan JSONB ditelusuri pada Integrasi. Karena cakupan jenis hubungannya berbeda, angka relasi kedua halaman tidak harus sama.

Jika OPD difilter, hubungan Ringkasan disertakan bila salah satu ujungnya milik OPD pilihan. Di Integrasi, kedua ujung hubungan harus berada dalam cakupan OPD pilihan. Perbedaan ini juga dapat menyebabkan angka tidak sama.

## 4. Buku panduan input dan pembaruan data

### 4.1 Pembaruan alur input

Pada halaman input baru enam domain tersedia panel **Cari Data yang Sudah Ada** di atas formulir. Panel ini membantu pengguna memeriksa inventaris sebelum membuat record baru, sekaligus membuka form edit record yang sudah ada.

Memilih hasil pencarian akan **berpindah ke halaman edit record tersebut**. Fitur ini bukan menyalin data lama ke formulir baru dan bukan menggabungkan dua record secara otomatis.

### 4.2 Memperbarui record yang sudah ada

1. Login ke CMS menggunakan akun yang sesuai.
2. Buka menu input domain yang hendak diperbarui.
3. Pada **Cari Data yang Sudah Ada**, masukkan kode atau nama minimal 2 karakter, maksimal 120 karakter.
4. Tunggu hasil pencarian. Pencarian berjalan otomatis setelah jeda singkat saat berhenti mengetik.
5. Periksa nama, kode, OPD, periode, kategori/jenis jika tersedia, dan badge status hasil pencarian.
6. Klik record yang tepat untuk membuka formulir edit.
7. Tinjau data lama, ubah isian yang diperlukan, lalu periksa kembali hubungan ke domain lain.
8. Pilih **Simpan draf** atau **Ajukan verifikasi** sesuai kesiapan data dan aksi yang tersedia pada formulir.
9. Pastikan muncul umpan balik berhasil. Jika ada kesalahan, perbaiki isian yang ditandai.

Pencarian mengembalikan paling banyak 20 hasil, diprioritaskan menurut pembaruan terbaru. Gunakan kode atau nama lebih spesifik bila record yang dicari belum terlihat.

### 4.3 Mengapa hasil pencarian dibatasi?

| Kondisi izin | Perilaku pencarian |
| --- | --- |
| Tidak memiliki izin edit maupun edit semua status | Tidak mendapatkan hasil yang dapat diedit. |
| Memiliki izin edit biasa | Hanya record draf atau dikembalikan yang memenuhi cakupan OPD. |
| Memiliki izin edit semua status (`editAny`) | Status tidak dibatasi pada draf/dikembalikan; hasil tetap mengikuti cakupan baca OPD. |
| Tidak memiliki izin melihat semua OPD | Hasil dibatasi ke OPD akun. |

Hasil kosong tidak membuktikan data belum pernah dibuat. Data mungkin ada pada OPD lain, sedang diajukan, terverifikasi, tervalidasi, atau tidak termasuk hak edit pengguna.

### 4.4 Membuat record baru

1. Cari dahulu dengan kode dan nama untuk mengurangi duplikasi.
2. Bila memang diperlukan record baru, lanjutkan formulir baru di bawah panel pencarian.
3. Pilih periode dan OPD yang sesuai. OPD dapat terkunci mengikuti akun.
4. Lengkapi identitas, klasifikasi, atribut, serta hubungan domain sesuai formulir.
5. Pilih record terkait yang benar; perhatikan kode, nama, OPD, dan periode.
6. Gunakan **Simpan draf** jika pencatatan belum siap diajukan. Draf tetap harus memenuhi validasi yang diwajibkan formulir.
7. Gunakan **Ajukan verifikasi** jika siap diperiksa.

Panduan ini menjelaskan alur input bersama dan pencarian data lama. Rincian kolom yang wajib diisi tetap mengikuti formulir masing-masing domain dan jenis record.

### 4.5 Perbedaan simpan draf dan ajukan verifikasi

| Aksi/status | Arti |
| --- | --- |
| Simpan draf | Menyimpan pekerjaan sebagai draf; belum menjadi inventaris tervalidasi portal. |
| Ajukan verifikasi | Mengirim record ke antrean verifikasi domain. |
| Terverifikasi | Lolos tahap verifikasi, kemudian menunggu validasi akhir. |
| Tervalidasi | Lolos validasi akhir dan dapat masuk portal sesuai cakupan/hak akses. |
| Dikembalikan | Perlu diperbaiki berdasarkan catatan pemeriksa, lalu diajukan kembali. |

Alur umumnya: **Draf → Diajukan → Terverifikasi → Tervalidasi**. Pengembalian dapat terjadi pada tahap pemeriksaan. Simpan atau ajukan tidak berarti record langsung muncul pada Ringkasan dan Integrasi.

Verifikasi Proses Bisnis dan Layanan ditangani Bagian Organisasi; domain Data, Aplikasi, Infrastruktur, dan Keamanan oleh verifikator domain Diskominfo. Validasi akhir dilakukan oleh pihak yang memiliki izin validasi. Penugasan operasional mengikuti konfigurasi hak akses organisasi.

### 4.6 Mengisi referensi agar hubungan dapat terbaca

| Isian/hubungan | Hal yang perlu diperhatikan |
| --- | --- |
| Pilihan record terkait | Pilih record tujuan yang benar agar tautan antar-ID mengarah ke entri yang tepat. |
| Cloud, server, SPLP, JIP pada Aplikasi | Nilai dicocokkan dengan nama record Infrastruktur pada periode yang sama. Gunakan nama yang konsisten. |
| Input data dan output data pada Aplikasi | Kode dataset dicocokkan dengan record Data pada periode yang sama. Pada pembacaan integrasi, beberapa kode dipisahkan per baris. |
| Referensi keamanan | Kode dicocokkan dengan kegiatan keamanan pada periode dan jenis yang sesuai; tampil hanya bila pengguna memiliki akses. |

Pencocokan nama Infrastruktur mengabaikan huruf besar/kecil dan spasi di awal/akhir isian referensi aplikasi. Pencocokan kode Data tidak dinormalisasi menjadi huruf kecil. Hindari variasi ejaan, tambahan keterangan, atau kode yang berbeda dari record tujuan.

Referensi yang tidak menemukan record tujuan tidak digambar. Tidak munculnya garis belum membuktikan bahwa isian referensinya kosong. Bila beberapa record tujuan memiliki nama yang sama pada periode yang sama, referensi nama dapat cocok ke lebih dari satu record; gunakan identitas yang jelas dan tinjau hasilnya.

## 5. Konsep Integrasi Sistem

### 5.1 Dua tingkat visualisasi

**Peta hubungan domain di bagian atas** merangkum jumlah record dan hubungan antardomain. Satu bulatan mewakili satu domain, bukan satu aplikasi. Angka pada bulatan adalah jumlah record domain dalam cakupan. Label garis adalah jumlah relasi antardomain, bukan jumlah record unik.

**Visualisasi keterkaitan data setelah pemilihan record** memperlihatkan record individual yang berhubungan langsung. Record dikelompokkan per domain dan dihubungkan panah.

Garis ringkasan domain tidak memberikan rincian jenis referensi. Gunakan visualisasi detail serta tabel hubungan untuk mengetahui sumber dan jenis hubungan.

### 5.2 Makna pangkal dan ujung panah

```text
Aplikasi Pelayanan ─────→ Dataset Penduduk
       sumber                  tujuan
```

Artinya record Aplikasi Pelayanan memiliki hubungan yang merujuk Dataset Penduduk. Pangkal adalah sumber rujukan, sedangkan ujung panah adalah record yang dirujuk.

**Panah bukan otomatis arah aliran data, urutan proses bisnis, arah gangguan, atau bukti koneksi jaringan.** Maknanya mengikuti hubungan yang disimpan pada pencatatan.

Contoh lain, tautan langsung Infrastruktur ke Aplikasi dapat mengarah dari Infrastruktur ke Aplikasi, sedangkan referensi cloud pada Aplikasi mengarah dari Aplikasi ke Infrastruktur. Perbedaan arah ini berasal dari sumber pencatatannya.

Panah dua arah pada satu jenis garis berarti terdapat rujukan kedua arah untuk pasangan tersebut. Ini tidak menyatakan sinkronisasi data dua arah secara operasional.

### 5.3 Garis utuh dan putus-putus

| Gaya | Makna | Contoh |
| --- | --- | --- |
| Utuh teal | Relasi langsung tersimpan melalui tabel penghubung antar-ID record. | Aplikasi dipilih terkait dengan Dataset A. |
| Putus-putus merah | Referensi yang ditemukan dari kode/nama atau struktur referensi keamanan. | Nama cloud pada Aplikasi cocok dengan nama Infrastruktur; kode input data cocok dengan Dataset. |

Warna merah pada referensi adalah pembeda visual, bukan penetapan status salah, bahaya, atau tingkat risiko.

Jika satu pasangan record memiliki beberapa hubungan sejenis, visual menggabungkannya menjadi satu garis untuk jenis tersebut. Keterangan hubungan dapat dilihat dengan mengarahkan kursor ke garis; rincian lengkap tersedia pada tabel.

Jika pasangan record memiliki tautan langsung sekaligus referensi, **garis utuh dan putus-putus sama-sama tampil melalui jalur terpisah**. Tidak ada jenis yang disembunyikan hanya karena jenis lain tersedia.

### 5.4 Contoh cloud

```text
Record Aplikasi: Aplikasi Pelayanan
Isian cloud:    Cloud Pemkab

Record Infrastruktur: Cloud Pemkab
Periode:              sama dengan Aplikasi

Aplikasi Pelayanan - - - → Cloud Pemkab
```

Garis putus-putus ditemukan karena nama cocok. Jika ada juga tautan langsung antar-ID pada pendataan, peta dapat menampilkan garis utuh pada jalur lain.

Jika nama Infrastruktur diganti tetapi isian cloud aplikasi tetap memakai nama lama, referensi dapat kehilangan kecocokan. Tautan langsung berbasis ID dapat tetap bertahan selama ID record tujuan tidak berubah.

## 6. Buku panduan Integrasi Sistem

### 6.1 Memilih cakupan

1. Buka `/integrasi` atau tombol Integrasi dari Ringkasan.
2. Pilih **Periode**.
3. Pilih satu/beberapa **Perangkat Daerah**, atau kosongkan untuk seluruh OPD yang tersedia.
4. Pilih **Domain** untuk mempersempit daftar record yang akan dicari.
5. Periksa chip filter atau gunakan **Reset filter**.

Filter Domain mempersempit daftar pemilihan record dan menyorot hubungan di peta atas. Filter ini tidak membuang domain tetangga dari analisis record terpilih. Periode dan OPD menentukan cakupan record dan relasi yang dibaca.

### 6.2 Menggunakan bulatan domain

1. Klik bulatan, misalnya **Aplikasi**.
2. Daftar pemilihan record difilter ke Aplikasi; muncul notifikasi **Filter diterapkan**.
3. Klik bulatan yang sama lagi untuk melepas filter; muncul **Filter dilepas**.
4. Klik bulatan lain untuk mengganti domain.
5. Gunakan **Urungkan** pada notifikasi untuk mengembalikan keadaan sebelum klik tersebut.

Klik bulatan juga mengosongkan pilihan record sebelumnya. Ini memisahkan pemilihan domain dari pemilihan record yang akan diperiksa.

Di layar kecil, peta atas ditampilkan sebagai kartu domain dan daftar relasi agar tetap terbaca. Perilaku pemilihannya sama.

### 6.3 Membaca statistik peta atas

| Informasi | Perhitungan |
| --- | --- |
| Angka bulatan | Jumlah record pada domain dalam cakupan. |
| Total relasi | Banyaknya entri hubungan dalam cakupan, termasuk beberapa jenis hubungan pada pasangan yang sama. |
| Record terhubung | Persentase record unik yang menjadi salah satu ujung relasi terhadap seluruh record dalam cakupan. |
| Label garis domain | Akumulasi hubungan dua domain, tanpa membedakan arah. |

Hubungan antarrecord dalam domain yang sama masuk statistik total relasi dan record terhubung, tetapi tidak digambar sebagai garis antardomain pada peta atas. Karena itu jumlah label garis antardomain dapat berbeda dari total relasi.

Persentase terhubung bukan skor kematangan atau bukti seluruh kebutuhan integrasi organisasi sudah terpenuhi.

### 6.4 Memilih, mengganti, dan melepas record

1. Pada tabel **Pilih data untuk melihat keterkaitan**, cari kode, nama, atau nama OPD.
2. Gunakan navigasi halaman bila hasil lebih dari 10 baris.
3. Klik record yang ingin diperiksa. Badge **Dipilih** dan notifikasi **Data dipilih** muncul.
4. Klik baris lain untuk mengganti pilihan; muncul **Pilihan data diganti**.
5. Klik record yang sama lagi, atau tombol **Lepas pilihan**, untuk membatalkan pilihan; muncul **Pilihan data dilepas**.
6. Gunakan **Urungkan** pada notifikasi bila ingin kembali ke pilihan sebelumnya.

Pilihan juga dapat diganti dengan klik node pada visualisasi detail. Klik node yang sedang dipilih akan melepas pilihan. Tombol **Detail record** tidak ditampilkan di panel pilihan; tombol yang tersedia adalah **Lepas pilihan**.

### 6.5 Panel analisis dan visualisasi detail

Panel **Analisis Dampak** sudah terlihat sejak awal ketika inventaris tersedia. Sebelum ada pilihan, panel menampilkan petunjuk memilih data. Setelah record dipilih, tampil identitas dan jumlah keterkaitannya.

Di bawahnya muncul **Visualisasi keterkaitan data**, **Record terdampak dalam simulasi**, serta **Hubungan langsung record**.

- Visual menampilkan record pilihan dan tetangga langsungnya, dikelompokkan per domain.
- Maksimal 6 record per domain digambar, termasuk prioritas record pilihan.
- Pada layar sempit, geser area visual secara horizontal; fokus keyboard pada area juga tersedia.
- Perbedaan garis mengikuti legenda pada bagian 5.
- Peta merupakan cuplikan. Tabel di bawah digunakan untuk memeriksa seluruh hasil dalam cakupan yang dimuat.

Klik baris pada tabel record terdampak membuka dialog informasi ringkas. Dialog dapat digunakan untuk membuka dashboard domain atau menelusuri record tersebut. Tabel hubungan langsung menunjukkan **Dari**, **Ke**, **Hubungan**, dan **Bentuk referensi**.

## 7. Cara membaca simulasi perubahan dan penghapusan

### 7.1 Posisi simulasi dalam rekap SPBE

Antarmuka saat ini masih menggunakan judul **Analisis Dampak**, pilihan **Perubahan data** / **Penghapusan data**, dan label **Potensi**. Dalam konteks rekap SPBE, bacalah sebagai analisis keterkaitan pencatatan yang perlu diperiksa.

Istilah “Analisis Keterkaitan” adalah penjelasan konseptual dalam dokumen ini, bukan pernyataan bahwa seluruh label antarmuka sudah diganti.

Simulasi tidak mengedit, menghapus, atau mengirim instruksi ke aplikasi, server, cloud, maupun record database. Pilihan simulasi hanya mengubah penjelasan hasil analisis.

### 7.2 Perubahan data

Record yang berhubungan langsung diberi status **Potensi** karena perubahan isinya mungkin memerlukan pemeriksaan pihak pemilik data.

| Jenis hubungan | Makna pemeriksaan |
| --- | --- |
| Tautan langsung berbasis ID | Mengganti kode/nama tidak otomatis memutus tautan ID, tetapi makna hubungan atau penggunaannya mungkin perlu diperbarui. |
| Referensi kode/nama | Mengganti kode/nama tujuan dapat membuat nilai referensi lama tidak cocok lagi. |
| Referensi keamanan | Periksa konsistensi rujukan kode kegiatan/jenis setelah perubahan. |

Simulator tidak membandingkan isi sebelum/sesudah edit, sehingga belum mengetahui kolom mana yang benar-benar berubah. “Potensi” bukan hasil pengujian bahwa sistem lain gagal.

### 7.3 Penghapusan data

Contoh:

```text
Aplikasi A ───→ Dataset B
```

Jika Dataset B dihapus dari inventaris, yang harus diperiksa adalah hubungan Aplikasi A terhadap Dataset B. Tidak dapat disimpulkan bahwa aplikasi operasional A berhenti berjalan.

| Label hasil saat ini | Makna yang tepat |
| --- | --- |
| Pasti pada tautan | Model simulasi menandai tautan penghubung langsung sebagai akan terlepas jika penghapusan terjadi sesuai aturan relasi yang diasumsikan. Record terkait tidak otomatis ikut dihapus. |
| Potensi | Referensi kode/nama atau referensi lain dapat tertinggal dan perlu diperiksa. |

Label “pasti” terbatas pada tautan pencatatan. Model ini bukan pemeriksaan aturan penghapusan database aktif per constraint. Pelaksanaan penghapusan sebenarnya tetap harus memeriksa aturan database dan prosedur pengelolaan yang berlaku.

### 7.4 Membaca angka hasil

| Angka/badge | Makna |
| --- | --- |
| Domain terkait | Banyaknya domain berbeda dari record tetangga yang ditemukan; dapat mencakup domain yang sama dengan record pilihan. |
| Record terkait | Jumlah record unik tetangga langsung; record pilihan tidak dihitung kembali. |
| Relasi langsung | Banyaknya entri hubungan masuk/keluar record pilihan; satu tetangga bisa memiliki beberapa relasi. |
| Record dengan tautan pasti terlepas | Jumlah tetangga unik yang memiliki setidaknya satu tautan langsung yang dikategorikan pasti pada simulasi penghapusan. Ini bukan jumlah aplikasi rusak. |

Pada simulasi perubahan, kategori pasti terlepas tidak diaktifkan. Jika pasangan yang sama mempunyai tautan langsung dan referensi nama, tetangganya tetap dihitung sekali pada daftar record terkait, sementara tabel relasi dapat memuat beberapa baris.

### 7.5 Cakupan pemeriksaan dampak

Analisis saat ini membaca **tetangga langsung**, baik hubungan yang masuk maupun keluar dari record pilihan. Analisis tidak otomatis menyusuri hubungan bertingkat.

```text
A → B → C
```

Saat A dipilih, B dapat masuk hasil langsung. C tidak otomatis dinyatakan terdampak melalui B. Untuk menelusuri C, pilih B dan periksa hubungannya.

Karena hubungan masuk dan keluar sama-sama dibaca, hasil sebaiknya disampaikan sebagai **record terkait yang perlu diperiksa**, bukan daftar ketergantungan operasional yang sudah terbukti.

## 8. Contoh penggunaan dari awal sampai akhir

### 8.1 Memperbaiki aplikasi yang sudah tercatat

1. Buka input Aplikasi di CMS.
2. Cari “Aplikasi Pelayanan” melalui panel pencarian data lama.
3. Pastikan OPD, periode, kode, dan statusnya benar.
4. Buka record tersebut, bukan membuat duplikat baru.
5. Perbarui isian cloud menjadi nama Infrastruktur yang benar dan tinjau pilihan record terkait.
6. Simpan draf atau ajukan verifikasi.
7. Tunggu proses pemeriksaan sampai record memenuhi status publikasi portal.
8. Buka Ringkasan, pilih periode dan OPD yang sama.
9. Buka Integrasi, filter Aplikasi, lalu pilih record tadi.
10. Periksa panah ke Infrastruktur dan tabel hubungan untuk memastikan apakah berasal dari tautan langsung, referensi cloud, atau keduanya.

### 8.2 Meninjau rencana penghapusan dataset

1. Buka Integrasi dan pilih cakupan OPD yang cukup; pilih seluruh OPD bila perlu meninjau hubungan lintas OPD.
2. Pilih domain Data dan cari dataset tujuan.
3. Klik dataset, kemudian pilih **Penghapusan data**.
4. Catat record terkait, relasi langsung, serta referensi yang perlu diperiksa.
5. Periksa visual dan tabel untuk mengetahui sumber setiap hubungan.
6. Koordinasikan pembaruan tautan/referensi dengan pemilik record terkait sebelum tindakan nyata.
7. Jangan menyimpulkan bahwa sejumlah aplikasi pasti mati hanya berdasarkan hasil simulasi.

### 8.3 Membaca perbedaan angka Ringkasan dan Integrasi

Misalnya Ringkasan menampilkan 8 tautan langsung. Integrasi memuat 8 tautan tersebut dan 3 referensi kode/nama dalam cakupan setara. Integrasi dapat menampilkan 11 relasi, tetapi jumlah garis detail bisa lebih sedikit karena hubungan sejenis pada pasangan yang sama digabung secara visual.

Periksa pula filter OPD: Ringkasan menyertakan hubungan jika salah satu ujungnya milik OPD pilihan; Integrasi memerlukan kedua ujung berada dalam cakupan pilihan. Selisih angka tidak selalu berarti kesalahan data.

## 9. Pemecahan masalah

| Gejala | Kemungkinan penyebab | Langkah pemeriksaan |
| --- | --- | --- |
| Data lama tidak ditemukan pada form input | Kata pencarian terlalu pendek, hasil dibatasi 20, hak edit/status/OPD tidak memenuhi. | Gunakan kode spesifik, periksa OPD dan status, atau gunakan halaman daftar sesuai hak akses. |
| Record baru belum muncul di portal | Masih draf, diajukan, terverifikasi, atau periode/OPD berbeda. | Periksa status validasi akhir dan filter portal. |
| Garis cloud/server tidak muncul | Nama tujuan tidak cocok, periode berbeda, record belum tervalidasi, atau target di luar filter. | Cocokkan nama dan periode; perluas filter OPD. |
| Garis input/output data tidak muncul | Kode dataset tidak cocok atau kode tidak dipisahkan sesuai format. | Periksa kode persis dan pemisahan per baris. |
| Garis Keamanan tidak muncul | Akun tidak memiliki akses atau kode/jenis/periode tidak cocok. | Periksa izin Dashboard Keamanan dan rujukan kegiatan. |
| Ada dua jenis garis pada pasangan sama | Ada tautan langsung sekaligus referensi kode/nama. | Lihat label hubungan di tabel; jalurnya memang dipisahkan. |
| Record terkait tidak terlihat pada visual | Cuplikan maksimal 6 record per domain. | Gunakan tabel untuk hasil lengkap dalam cakupan yang dimuat. |
| Jumlah garis tidak sama dengan jumlah relasi | Beberapa relasi digabung pada visual, atau cuplikan dibatasi. | Bandingkan dengan tabel hubungan langsung. |
| Record tidak punya garis | Tidak ada hubungan yang berhasil ditemukan dalam cakupan saat ini. | Periksa relasi pada CMS, referensi, status, periode, dan filter OPD. |
| Data belum tersedia | Pembacaan database gagal/tidak tersedia. | Muat ulang dan hubungi pengelola bila berlanjut; jangan menyamakan dengan inventaris nol. |
| Cakupan terbatas | Pemuatan peta mencapai batas performa. | Perlakukan analisis sebagai sebagian data dan lakukan pemeriksaan lanjutan. |

## 10. Batasan dan catatan pengelolaan

1. **Kelengkapan mengikuti pencatatan.** Tidak ada garis tidak selalu berarti tidak ada hubungan nyata; hubungan mungkin belum dicatat atau tidak cocok.
2. **Hanya inventaris tervalidasi yang masuk peta.** Draft CMS tidak otomatis menjadi node publik.
3. **Hak akses dapat mengubah hasil.** Pengguna publik tidak melihat seluruh cakupan Keamanan.
4. **Filter OPD dapat menyembunyikan tetangga lintas OPD.** Perluas cakupan sebelum menyimpulkan record tidak terkait.
5. **Peta Integrasi dibatasi maksimum 6.000 record dan 24.000 relasi yang dimuat.** Banner cakupan terbatas menandakan analisis belum menyeluruh.
6. **Cuplikan detail berbeda dari batas pemuatan.** Maksimal 6 node per domain digambar, sedangkan tabel memakai hasil dalam cakupan yang sudah dimuat.
7. **Referensi tidak cocok tidak digambar sebagai node bebas.** Isian cloud tanpa pasangan Infrastruktur tidak menjadi bulatan tersendiri.
8. **Arah panah mengikuti sumber pencatatan.** Jangan mengartikannya otomatis sebagai aliran teknis atau bukti ketergantungan operasional.
9. **Analisis hanya hubungan langsung.** Belum ada penelusuran dampak otomatis beberapa tingkat pada halaman ini.
10. **Simulasi bukan transaksi penghapusan.** Keputusan perubahan/penghapusan tetap memerlukan pemeriksaan record, aturan database, dan pemilik data.
11. **Istilah antarmuka belum seluruhnya menggunakan bahasa keterkaitan.** “Potensi” dibaca sebagai kebutuhan pemeriksaan; “pasti” dibaca terbatas pada tautan dalam model simulasi.

## 11. Rujukan implementasi

Daftar ini ditujukan untuk pemelihara agar panduan dapat diperbarui ketika perilaku aplikasi berubah.

| Bagian | Berkas |
| --- | --- |
| Ringkasan | [overview-dashboard.tsx](../components/dashboards/overview-dashboard.tsx) |
| Komposisi, peringkat, dan Sankey | [overview-visuals.tsx](../components/dashboards/overview-visuals.tsx) |
| Pencarian record pada input | [existing-record-search.tsx](../components/cms/existing-record-search.tsx) |
| Aksi pencarian CMS | [existing-actions.ts](../app/cms/existing-actions.ts) |
| Batas status dan cakupan pencarian edit | [existing.ts](../lib/cms/existing.ts) |
| Hak akses | [permissions.ts](../lib/permissions.ts) |
| Halaman dan interaksi Integrasi | [integration-dashboard.tsx](../components/integrasi/integration-dashboard.tsx) |
| Visual domain | [domain-map.tsx](../components/integrasi/domain-map.tsx) |
| Visual record dan jenis garis | [record-map.tsx](../components/integrasi/record-map.tsx) |
| Pembacaan inventaris dan pembentukan relasi | [repo.ts](../lib/integrasi/repo.ts) |
| Model dan simulasi hubungan | [model.ts](../lib/integrasi/model.ts) |
| Pemeriksaan akses Keamanan | [access.ts](../lib/integrasi/access.ts) |

### Pemeriksaan berkala panduan

Saat memperbarui fitur, cocokkan kembali nama tombol, label simulasi, izin edit, aturan pencocokan referensi, cakupan filter OPD, batas pemuatan, dan aturan penghapusan. Perubahan istilah yang baru diusulkan dalam diskusi tidak boleh didokumentasikan sebagai fitur aktif sebelum diterapkan.
