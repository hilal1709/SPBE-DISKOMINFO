-- Akun yang masih memakai hash sandi yang tertulis di repositori publik (seed.sql = admin123, migrasi 004/009–014 =
-- sandi demo bersama) dinonaktifkan dan sesinya dicabut. Akun yang sandinya sudah diganti tidak tersentuh.
-- Pemulihan superadmin: pnpm admin:buat <email> "<nama>" (sandi sementara acak, wajib diganti saat masuk).
update users
set active = false, must_change_password = true, password_changed_at = now(), updated_at = now()
where password_hash in (
  '$2b$10$h6.yk3.c9KJXPB95Prfeee.f5Iw8VAXo9.D31shF1Fko265NxJtTa',
  '$2b$10$KkH8OasC9DhofvM.clBdmu91xxqji4ATHg6zkZ/OyEhiA2JMgpShm'
);
