-- Peran kustom: Superadmin dapat membuat peran sendiri di Pengaturan → Hak Akses.
-- Kolom peran menjadi teks agar dapat memuat peran bawaan (lib/roles.ts) maupun kustom; validasi di aplikasi.
ALTER TABLE users ALTER COLUMN role TYPE text USING role::text;
ALTER TABLE role_access ALTER COLUMN role TYPE text USING role::text;

CREATE TABLE IF NOT EXISTS custom_roles (
  key text PRIMARY KEY,
  label text NOT NULL UNIQUE,
  description text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
