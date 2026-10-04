INSERT INTO architecture_periods (name,start_year,end_year,is_active) VALUES ('2025–2029',2025,2029,true);
INSERT INTO opd (code,name) VALUES
('DISKOMINFO','Dinas Komunikasi dan Informatika'),('DINKES','Dinas Kesehatan'),('DISPENDIK','Dinas Pendidikan'),('BKPSDM','Badan Kepegawaian Daerah dan Pengembangan SDM'),('SETDA','Sekretariat Daerah');
INSERT INTO ral_references (code,name,level) VALUES ('RAL.01','Layanan Publik',1),('RAL.02','Layanan Administrasi Pemerintahan',1);
INSERT INTO rab_references (code,name,level) VALUES ('RAB.04.01','Pemerintahan',2),('RAB.05.03','Pendidikan',2);
INSERT INTO users (email,password_hash,name,role) VALUES ('admin@gresikkab.go.id','$2b$10$h6.yk3.c9KJXPB95Prfeee.f5Iw8VAXo9.D31shF1Fko265NxJtTa','Admin Diskominfo','superadmin');
