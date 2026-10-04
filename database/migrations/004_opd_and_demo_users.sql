-- 30 Perangkat Daerah (sheet Requirement Landing) dan akun demo per role.
INSERT INTO opd (code,name) VALUES
('SETDA','Sekretariat Daerah'),
('DISKOMINFO','Dinas Komunikasi dan Informatika'),
('BKPSDM','Badan Kepegawaian Daerah dan Pengembangan Sumber Daya Manusia'),
('DINKES','Dinas Kesehatan'),
('DISPENDIK','Dinas Pendidikan'),
('DISTAN','Dinas Pertanian'),
('BAKESBANGPOL','Badan Kesatuan Bangsa dan Politik'),
('DAMKAR','Dinas Pemadam Kebakaran dan Penyelamatan'),
('DISPARBUD','Dinas Pariwisata dan Ekonomi Kreatif, Kebudayaan, Kepemudaan, dan Olahraga'),
('DISPERPUSIP','Dinas Perpustakaan dan Kearsipan'),
('DISPERKIM','Dinas Cipta Karya, Perumahan dan Kawasan Permukiman'),
('DP3AKB','Dinas Keluarga Berencana, Pemberdayaan Perempuan, dan Perlindungan Anak'),
('KECAMATAN','Kecamatan'),
('BPPKAD','Badan Pendapatan, Pengelolaan Keuangan dan Aset Daerah'),
('DLH','Dinas Lingkungan Hidup'),
('DISPENDUKCAPIL','Dinas Kependudukan dan Pencatatan Sipil'),
('DISKOPERINDAG','Dinas Koperasi, Usaha Mikro dan Perindag'),
('BAPPEDA','Badan Perencanaan, Pembangunan, Penelitian dan Pengembangan Daerah'),
('DPUTR','Dinas Pekerjaan Umum dan Tata Ruang'),
('DINSOS','Dinas Sosial'),
('DISKAN','Dinas Perikanan'),
('DISNAKER','Dinas Tenaga Kerja'),
('INSPEKTORAT','Inspektorat'),
('SATPOLPP','Dinas Satpol PP'),
('DPMPTSP','Dinas Penanaman Modal dan Pelayanan Terpadu Satu Pintu'),
('ARSIPDESA','Pelaporan dan Tindak Lanjut Penyimpanan Alih Media Arsip Vital Desa'),
('BPBD','Badan Penanggulangan Bencana Daerah'),
('DISHUB','Dinas Perhubungan'),
('SETWAN','Sekretariat Dewan'),
('DPMD','Dinas Pemberdayaan Masyarakat dan Desa')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

-- Akun demo per role untuk pengujian lokal. Kata sandi demo (semua akun): spbe-demo-dc63ea
-- Ganti atau nonaktifkan sebelum produksi.
INSERT INTO users (email,password_hash,name,role,opd_id) VALUES
('operator@gresikkab.go.id','$2b$10$KkH8OasC9DhofvM.clBdmu91xxqji4ATHg6zkZ/OyEhiA2JMgpShm','Operator Diskominfo','operator_opd',(SELECT id FROM opd WHERE code='DISKOMINFO')),
('organisasi@gresikkab.go.id','$2b$10$KkH8OasC9DhofvM.clBdmu91xxqji4ATHg6zkZ/OyEhiA2JMgpShm','Bagian Organisasi','organisasi',NULL),
('validator@gresikkab.go.id','$2b$10$KkH8OasC9DhofvM.clBdmu91xxqji4ATHg6zkZ/OyEhiA2JMgpShm','Validator Diskominfo','admin',NULL),
('pimpinan@gresikkab.go.id','$2b$10$KkH8OasC9DhofvM.clBdmu91xxqji4ATHg6zkZ/OyEhiA2JMgpShm','Pimpinan Daerah','pimpinan',NULL)
ON CONFLICT (email) DO NOTHING;
